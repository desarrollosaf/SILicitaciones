import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Alert, DashboardSummary, Dictamen, ImportResult, Licitacion, Memo, Partida, Period, Person, Warehouse, WarehouseBalance,
} from './models';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl;

/** Único punto de contacto con la API. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private params(values: Record<string, string | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return params;
  }

  // Periodos
  periods(): Observable<Period[]> { return this.http.get<Period[]>(`${BASE}/periods`); }
  createPeriod(body: Partial<Period>): Observable<Period> { return this.http.post<Period>(`${BASE}/periods`, body); }
  togglePeriod(id: string): Observable<Period> { return this.http.post<Period>(`${BASE}/periods/${id}/toggle`, {}); }
  deletePeriod(id: string) { return this.http.delete(`${BASE}/periods/${id}`); }

  // Catálogos
  warehouses(): Observable<Warehouse[]> { return this.http.get<Warehouse[]>(`${BASE}/warehouses`); }
  warehouseBalance(periodId: string): Observable<WarehouseBalance> {
    return this.http.get<WarehouseBalance>(`${BASE}/warehouses/balance`, { params: this.params({ periodId }) });
  }

  // Dictámenes
  dictamenes(periodId: string): Observable<Dictamen[]> {
    return this.http.get<Dictamen[]>(`${BASE}/dictamenes`, { params: this.params({ periodId }) });
  }
  nextDictamenFolio(periodId: string): Observable<{ folio: string }> {
    return this.http.get<{ folio: string }>(`${BASE}/dictamenes/next-folio`, { params: this.params({ periodId }) });
  }
  saveDictamen(body: Partial<Dictamen>): Observable<Dictamen> {
    return body.id
      ? this.http.patch<Dictamen>(`${BASE}/dictamenes/${body.id}`, body)
      : this.http.post<Dictamen>(`${BASE}/dictamenes`, body);
  }
  deleteDictamen(id: string) { return this.http.delete(`${BASE}/dictamenes/${id}`); }

  // Procedimientos
  licitaciones(periodId: string): Observable<Licitacion[]> {
    return this.http.get<Licitacion[]>(`${BASE}/licitaciones`, { params: this.params({ periodId }) });
  }
  saveLicitacion(body: Partial<Licitacion>): Observable<Licitacion> {
    return body.id
      ? this.http.patch<Licitacion>(`${BASE}/licitaciones/${body.id}`, body)
      : this.http.post<Licitacion>(`${BASE}/licitaciones`, body);
  }
  deleteLicitacion(id: string) { return this.http.delete(`${BASE}/licitaciones/${id}`); }

  // Partidas
  partidas(periodId: string, licitacionId?: string): Observable<Partida[]> {
    return this.http.get<Partida[]>(`${BASE}/partidas`, { params: this.params({ periodId, licitacionId }) });
  }
  availablePartidas(periodId: string, licitacionId?: string, memoId?: string): Observable<Partida[]> {
    return this.http.get<Partida[]>(`${BASE}/partidas/available`, { params: this.params({ periodId, licitacionId, memoId }) });
  }
  savePartida(body: Partial<Partida>): Observable<Partida> {
    return body.id
      ? this.http.patch<Partida>(`${BASE}/partidas/${body.id}`, body)
      : this.http.post<Partida>(`${BASE}/partidas`, body);
  }
  deletePartida(id: string) { return this.http.delete(`${BASE}/partidas/${id}`); }

  // Resguardatarios
  people(search = ''): Observable<Person[]> {
    return this.http.get<Person[]>(`${BASE}/people`, { params: this.params({ search }) });
  }
  savePerson(body: Partial<Person>): Observable<Person> {
    return body.id
      ? this.http.patch<Person>(`${BASE}/people/${body.id}`, body)
      : this.http.post<Person>(`${BASE}/people`, body);
  }
  deletePerson(id: string) { return this.http.delete(`${BASE}/people/${id}`); }

  // Memorándums
  memos(periodId: string): Observable<Memo[]> {
    return this.http.get<Memo[]>(`${BASE}/memos`, { params: this.params({ periodId }) });
  }
  nextMemoFolio(periodId: string): Observable<{ folio: string }> {
    return this.http.get<{ folio: string }>(`${BASE}/memos/next-folio`, { params: this.params({ periodId }) });
  }
  saveMemo(body: any): Observable<Memo> {
    return body.id ? this.http.patch<Memo>(`${BASE}/memos/${body.id}`, body) : this.http.post<Memo>(`${BASE}/memos`, body);
  }
  deleteMemo(id: string) { return this.http.delete(`${BASE}/memos/${id}`); }
  printableMemo(id: string) { return this.http.get<any>(`${BASE}/memos/${id}/printable`); }

  // Tablero
  summary(periodId: string): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${BASE}/dashboard/summary`, { params: this.params({ periodId }) });
  }
  alerts(periodId: string): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${BASE}/dashboard/alerts`, { params: this.params({ periodId }) });
  }

  // Importación CSV
  importCsv(kind: 'licitaciones' | 'partidas' | 'people', csv: string, periodId?: string): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${BASE}/imports/${kind}`, { csv }, { params: this.params({ periodId }) });
  }
}
