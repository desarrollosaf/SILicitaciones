import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../data-source';
import { Dictamen, Holiday, Licitacion, Memo, MemoAllocation, Partida, Period, Person, Warehouse } from '../entities';

/**
 * Crea el esquema y carga los datos mínimos para trabajar: periodos, bodegas,
 * calendario de asueto y un procedimiento de ejemplo con sus partidas.
 *
 * Para migrar el padrón institucional completo, lee aquí el archivo Excel y
 * llena la tabla `people` con los pares nombre / CVE-ADSC.
 */
async function seed() {
  const dataSource = new DataSource({ ...databaseConfig, synchronize: true });
  await dataSource.initialize();

  const periods = dataSource.getRepository(Period);
  if (await periods.count()) {
    console.log('La base ya tiene datos; no se hizo nada.');
    await dataSource.destroy();
    return;
  }

  await periods.save([
    { id: 'PER-2026', year: 2026, status: 'Abierto', startDate: '2026-01-01', endDate: '2026-12-31', openedDate: '2026-01-08', closedDate: null },
    { id: 'PER-2025', year: 2025, status: 'Cerrado', startDate: '2025-01-01', endDate: '2025-12-31', openedDate: '2025-01-10', closedDate: '2026-01-07' },
  ]);

  await dataSource.getRepository(Holiday).save([
    { date: '2026-09-16', description: 'Independencia' },
    { date: '2026-11-16', description: 'Revolución Mexicana' },
    { date: '2026-12-25', description: 'Navidad' },
  ]);

  const warehouses = await dataSource.getRepository(Warehouse).save([
    { id: 'W-LONGARES', name: 'Bodega de Longares', description: 'Bienes informáticos, audiovisuales y equipo inventariable.' },
    { id: 'W-MANTENIMIENTO', name: 'Bodega de Mantenimiento', description: 'Herramientas, refacciones y bienes para mantenimiento.' },
    { id: 'W-CONSUMIBLES', name: 'Bodega de Consumibles', description: 'Papelería, materiales y bienes de consumo.' },
  ]);

  const dictamen = await dataSource.getRepository(Dictamen).save({
    periodId: 'PER-2026',
    folio: 'DI/DT/001/2026',
    date: '2026-02-12',
    requester: 'Dirección de Informática',
    area: 'Dirección de Informática',
    object: 'Adquisición de bienes y accesorios informáticos',
    estimatedAmount: 4750000,
    procedureType: 'Licitación pública nacional',
    status: 'Procedimiento iniciado',
    fileName: 'Dictamen_Tecnico_001_2026.pdf',
  });

  const licitacion = await dataSource.getRepository(Licitacion).save({
    periodId: 'PER-2026',
    dictamenId: dictamen.id,
    type: 'Licitación pública nacional',
    number: 'CAS-LPNP03/2026/LXII-LEM',
    object: 'Adquisición de bienes y accesorios informáticos para las dependencias del Poder Legislativo',
    area: 'Dirección de Informática',
    fallDate: '2026-07-14',
    deliveryDays: 20,
    dayType: 'business',
    penaltyPct: 0.1,
    deliveryPlace: 'Bodega de bienes muebles, Av. Sebastián Lerdo de Tejada 829, Toluca',
  });

  const partidas = await dataSource.getRepository(Partida).save([
    {
      licitacionId: licitacion.id, number: '5', grupo: 'Informática', description: 'Computadora de escritorio (HP Pro 400 G9)',
      result: 'Adjudicada', quantity: 50, unit: 'Pieza', warehouseId: warehouses[0].id,
      provider: 'TEC REDES Y SERVICIOS INFORMÁTICOS, S.A. DE C.V.', brand: 'HP Pro 400 G9', unitPrice: 23850,
      fallDate: '2026-07-14', contractNumber: 'CAS-LPNP03-C01-2026', contractDate: '2026-08-04', deliveryDate: '2026-08-28',
      performanceGuarantee: 'Entregada', complianceStatus: 'Cumplimiento', warranty: '3 años', attachments: [],
    },
    {
      licitacionId: licitacion.id, number: '22', grupo: 'Informática', description: 'Laptop (HP ProBook 4 G1i 16)',
      result: 'Adjudicada', quantity: 8, unit: 'Pieza', warehouseId: warehouses[0].id,
      provider: 'TEC REDES Y SERVICIOS INFORMÁTICOS, S.A. DE C.V.', brand: 'HP ProBook 4 G1i 16', unitPrice: 31490,
      fallDate: '2026-07-14', contractNumber: 'CAS-LPNP03-C01-2026', contractDate: '2026-08-04', deliveryDate: null,
      performanceGuarantee: 'Entregada', complianceStatus: 'Pendiente', warranty: '3 años', attachments: [],
    },
    {
      licitacionId: licitacion.id, number: '3', grupo: 'Informática', description: 'Cámara web',
      result: 'Desierta', quantity: 107, unit: 'Pieza', warehouseId: warehouses[0].id,
      provider: '', brand: '', unitPrice: 0, fallDate: '2026-07-14',
      performanceGuarantee: 'No aplica', complianceStatus: 'No aplica', attachments: [],
    },
  ]);

  const people = await dataSource.getRepository(Person).save([
    { name: 'María Fernanda López Cruz', dependencyCode: '48000', area: 'Dirección de Informática' },
    { name: 'Jorge Alberto Medina Ruiz', dependencyCode: '48000', area: 'Dirección de Informática' },
    { name: 'Ana Sofía Hernández Díaz', dependencyCode: '20000', area: 'Secretaría de Asuntos Parlamentarios' },
  ]);

  const memo = dataSource.getRepository(Memo).create({
    periodId: 'PER-2026',
    licitacionId: licitacion.id,
    folio: '023/2026',
    date: '2026-09-03',
    recipient: 'Martha Maldonado Vilchis',
    status: 'Enviado',
    allocations: people.map((person) =>
      dataSource.getRepository(MemoAllocation).create({ partidaId: partidas[0].id, personId: person.id, quantity: 1 }),
    ),
  });
  await dataSource.getRepository(Memo).save(memo);

  console.log('Datos iniciales cargados.');
  await dataSource.destroy();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
