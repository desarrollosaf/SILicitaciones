import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dictamen, Licitacion, Partida, Person, Warehouse } from '../../entities';
import { PeriodsService } from '../periods/periods.service';
import { StockService } from '../stock/stock.service';
import { missingColumns, parseCsv, parseNumber } from './csv';
import { parseFlexibleDate } from '../../common/dates';
import { cleanName, normalize } from '../../common/text';

export interface ImportResult {
  created: number;
  updated: number;
  rejected: number;
  notes: string[];
}

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(Licitacion) private readonly licitaciones: Repository<Licitacion>,
    @InjectRepository(Partida) private readonly partidas: Repository<Partida>,
    @InjectRepository(Dictamen) private readonly dictamenes: Repository<Dictamen>,
    @InjectRepository(Person) private readonly people: Repository<Person>,
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
    private readonly periods: PeriodsService,
    private readonly stock: StockService,
  ) {}

  async importLicitaciones(periodId: string, csv: string): Promise<ImportResult> {
    await this.periods.assertOpen(periodId);
    const rows = parseCsv(csv);
    const missing = missingColumns(rows, ['numero_procedimiento', 'objeto']);
    if (missing.length) throw new BadRequestException(`Faltan las columnas: ${missing.join(', ')}.`);

    const result: ImportResult = { created: 0, updated: 0, rejected: 0, notes: [] };
    const period = await this.periods.findOne(periodId);

    for (const row of rows) {
      const number = cleanName(row.numero_procedimiento);
      const object = cleanName(row.objeto);
      if (!number || !object) { result.rejected += 1; continue; }

      const year = Number(number.match(/\/(20\d{2})\//)?.[1] ?? 0);
      if (year && year !== period.year) {
        result.rejected += 1;
        result.notes.push(`${number} pertenece a otro ejercicio.`);
        continue;
      }

      const folio = cleanName(row.folio_dictamen);
      const dictamen = folio
        ? await this.dictamenes.findOne({ where: { periodId } }).then(async () => {
            const all = await this.dictamenes.find({ where: { periodId } });
            return all.find((item) => normalize(item.folio) === normalize(folio)) ?? null;
          })
        : null;
      if (folio && !dictamen) { result.rejected += 1; result.notes.push(`Dictamen ${folio} no reconocido.`); continue; }

      const existing = (await this.licitaciones.find({ where: { periodId } })).find(
        (item) => normalize(item.number) === normalize(number),
      );
      const deliveryDays = parseNumber(row.plazo_entrega);
      const penalty = parseNumber(row.pena_por_dia_pct);
      const payload = {
        periodId,
        number,
        object,
        dictamenId: dictamen?.id ?? existing?.dictamenId ?? null,
        type: normalize(row.tipo_procedimiento).includes('adjudicacion directa') ? 'Adjudicación directa' : 'Licitación pública nacional',
        area: cleanName(row.unidad_administrativa_interesada) || existing?.area || '',
        fallDate: parseFlexibleDate(row.fecha_fallo) || existing?.fallDate || null,
        deliveryDays: deliveryDays && deliveryDays > 0 ? Math.round(deliveryDays) : existing?.deliveryDays ?? 20,
        dayType: normalize(row.tipo_dias).includes('natural') ? ('calendar' as const) : ('business' as const),
        penaltyPct: penalty ?? existing?.penaltyPct ?? 0.1,
        deliveryPlace: cleanName(row.lugar_entrega) || existing?.deliveryPlace || '',
      };

      if (existing) { Object.assign(existing, payload); await this.licitaciones.save(existing); result.updated += 1; }
      else { await this.licitaciones.save(this.licitaciones.create(payload)); result.created += 1; }
    }

    return result;
  }

  async importPartidas(periodId: string, csv: string): Promise<ImportResult> {
    await this.periods.assertOpen(periodId);
    const rows = parseCsv(csv);
    const required = ['numero_procedimiento', 'numero_partida', 'grupo', 'bien_concepto', 'resultado', 'cantidad', 'unidad_medida', 'bodega_recepcion'];
    const missing = missingColumns(rows, required);
    if (missing.length) throw new BadRequestException(`Faltan las columnas: ${missing.join(', ')}.`);

    const result: ImportResult = { created: 0, updated: 0, rejected: 0, notes: [] };
    const licitaciones = await this.licitaciones.find({ where: { periodId } });
    const warehouses = await this.warehouses.find();

    for (const row of rows) {
      const licitacion = licitaciones.find((item) => normalize(item.number) === normalize(row.numero_procedimiento));
      if (!licitacion) { result.rejected += 1; result.notes.push('Fila sin procedimiento relacionado.'); continue; }

      const number = cleanName(row.numero_partida);
      const grupo = cleanName(row.grupo);
      const description = cleanName(row.bien_concepto);
      const result_ = this.normalizeResult(row.resultado);
      const quantity = parseNumber(row.cantidad);
      const unit = this.normalizeUnit(row.unidad_medida);
      const warehouse = this.matchWarehouse(warehouses, row.bodega_recepcion);
      const unitPrice = parseNumber(row.precio_unitario_sin_iva);
      const deliveryDate = parseFlexibleDate(row.fecha_entrega_real);

      if (!number || !grupo || !description || !result_ || !unit || !warehouse || !Number.isInteger(quantity) || quantity < 1) {
        result.rejected += 1;
        continue;
      }
      if (row.fecha_entrega_real && !deliveryDate) {
        result.rejected += 1;
        result.notes.push(`Fecha de entrega no reconocida en la partida ${number}.`);
        continue;
      }

      const existing = (await this.partidas.find({ where: { licitacionId: licitacion.id } })).find(
        (item) => normalize(item.number) === normalize(number) && normalize(item.grupo) === normalize(grupo),
      );
      const committed = existing ? await this.stock.committed(existing.id) : 0;
      const desierta = result_ === 'Desierta';
      const payload = {
        licitacionId: licitacion.id,
        number,
        grupo,
        description,
        result: result_,
        quantity: Math.round(quantity),
        unit,
        warehouseId: warehouse.id,
        provider: desierta ? '' : cleanName(row.proveedor_adjudicado) || existing?.provider || '',
        brand: cleanName(row.marca_modelo) || existing?.brand || '',
        unitPrice: unitPrice ?? existing?.unitPrice ?? 0,
        fallDate: parseFlexibleDate(row.fecha_fallo) || existing?.fallDate || licitacion.fallDate || null,
        contractNumber: cleanName(row.numero_contrato) || existing?.contractNumber || '',
        contractDate: parseFlexibleDate(row.fecha_firma_contrato) || existing?.contractDate || null,
        deliveryDate: deliveryDate || existing?.deliveryDate || null,
        performanceGuarantee: desierta ? ('No aplica' as const) : existing?.performanceGuarantee ?? ('Pendiente' as const),
        complianceStatus: desierta ? ('No aplica' as const) : existing?.complianceStatus ?? ('Pendiente' as const),
        warranty: cleanName(row.garantia_fabricante) || existing?.warranty || '',
        notes: cleanName(row.observaciones) || existing?.notes || '',
      };

      if (committed && (payload.result !== 'Adjudicada' || payload.unit === 'Servicio' || payload.quantity < committed || !payload.deliveryDate)) {
        result.rejected += 1;
        result.notes.push(`La partida ${number} tiene bienes comprometidos y el archivo la dejaría inconsistente.`);
        continue;
      }

      if (existing) { Object.assign(existing, payload); await this.partidas.save(existing); result.updated += 1; }
      else { await this.partidas.save(this.partidas.create({ ...payload, attachments: [] })); result.created += 1; }
    }

    return result;
  }

  async importPeople(csv: string): Promise<ImportResult> {
    const rows = parseCsv(csv);
    const missing = missingColumns(rows, ['nombre']);
    if (missing.length) throw new BadRequestException(`Falta la columna ${missing.join(', ')}.`);

    const result: ImportResult = { created: 0, updated: 0, rejected: 0, notes: [] };
    for (const row of rows) {
      const name = cleanName(row.nombre);
      const dependencyCode = cleanName(row.clave_dependencia);
      if (!name || !dependencyCode) { result.rejected += 1; continue; }

      const existing = await this.people.findOne({ where: { name, dependencyCode } });
      if (existing) {
        existing.area = cleanName(row.area) || existing.area;
        await this.people.save(existing);
        result.updated += 1;
      } else {
        await this.people.save(this.people.create({ name, dependencyCode, area: cleanName(row.area) }));
        result.created += 1;
      }
    }
    return result;
  }

  private normalizeResult(value: string) {
    const map = { adjudicada: 'Adjudicada', desierta: 'Desierta', pendiente: 'Pendiente' } as const;
    return map[normalize(value)] ?? null;
  }

  private normalizeUnit(value: string) {
    const units = ['Pieza', 'Kit', 'Par', 'Combo', 'Servicio'] as const;
    return units.find((unit) => normalize(unit) === normalize(value)) ?? null;
  }

  private matchWarehouse(warehouses: Warehouse[], value: string) {
    const term = normalize(value);
    return (
      warehouses.find((warehouse) => normalize(warehouse.id) === term || normalize(warehouse.name) === term) ??
      warehouses.find((warehouse) => term && normalize(warehouse.name).includes(term)) ??
      null
    );
  }
}
