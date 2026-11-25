import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiResponse } from '../../interfaces/api-response';
import { IAcceso, ILogin, ISubmenu, IUsuario } from '../../interfaces/auth';
import { environment } from '../../environments/environment';

type LoginResponse = ApiResponse<ILogin>;

@Injectable({ providedIn: 'root' })
export class AuthService extends HttpService {
  private readonly endpoints = {
    login: '/aliado/login',
    verifyToken: '/aliado/verify-token',
    usuarios: '/aliado/usuarios',
  };

  // Signal para el estado del usuario
  private _user = signal<IUsuario>(this.loadUserFromStorage());
  private _accesos = signal<IAcceso[]>(this.loadAccesosFromStorage());
  private _empresas = signal<any[]>(this.loadEmpresasFromStorage());
  private _accesosLoading = signal<boolean>(false);
  public user = this._user.asReadonly();
  public accesos = this._accesos.asReadonly();
  public empresas = this._empresas.asReadonly();
  public accesosLoading = this._accesosLoading.asReadonly();

  private httpClient: HttpClient;
  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
    this.httpClient = http;
  }

  /** Cargar usuario desde localStorage (si existe) */
  private loadUserFromStorage(): IUsuario {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed: IUsuario = JSON.parse(user);
      // Si existe una foto cacheada en localStorage, úsala
      if (parsed?.userName) {
        const cached = localStorage.getItem(`fotoPerfil:${parsed.userName}`);
        if (cached && cached.startsWith('data:')) {
          parsed.photoUrl = cached as any;
        }
      }
      return parsed;
    }

    // Usuario "vacío"
    return {
      userId: '',
      fullName: 'Sin autenticar',
      userName: '',      
      password: '',
      email: '',
      photoUrl: '',
      lastPasswordUpdate: new Date(),
      huella: null,
      active: false,
      rolId: '',
      puestoId: null,
      // metodoId: null,
      created_at: new Date(),
      rol: {
        rolId: '',
        nombre: 'Sin autenticar',
        activo: false,
        global: false,
        esAdmin: false,
        verTodo: false,
        created_at: new Date()
      }
    };
  }

  private loadAccesosFromStorage(): IAcceso[] {
    const accesos = localStorage.getItem('accesos');
    if (accesos) return this.filtrarAccesosWeb(JSON.parse(accesos));

    // Accesos "vacíos"
    return [];
  }

  /**
   * Deja solo los accesos y submenús activos y visibles en web, ordenados por `orden`.
   * Se descartan los accesos que se quedan sin submenús visibles.
   */
  private filtrarAccesosWeb(accesos: IAcceso[]): IAcceso[] {
    const esVisible = (a: IAcceso | ISubmenu) => a.activo && a.showWeb && !!a.menu && a.menu.activo !== false;
    const porOrden = (a: { orden: number }, b: { orden: number }) => (a.orden ?? 0) - (b.orden ?? 0);

    return (accesos || [])
      .filter(esVisible)
      .map(a => ({ ...a, subMenus: (a.subMenus || []).filter(esVisible).sort(porOrden) }))
      .filter(a => a.subMenus.length > 0)
      .sort(porOrden);
  }

  private loadEmpresasFromStorage(): any[] {
    const empresas = localStorage.getItem('empresas');
    if (empresas) return JSON.parse(empresas);
    return [];
  }
  


  /** Obtener snapshot del usuario actual */
  getUserStorage(): IUsuario {
    return this._user();
  }

  getAccesosStorage(): IAcceso[] {
    return this._accesos();
  }

  /** Actualizar usuario en memoria y storage */
  updateUser(user: IUsuario) {
    // Nunca conservar la contraseña (ni su hash) en memoria ni en localStorage
    const safeUser: IUsuario = { ...user, password: '' };
    this._user.set(safeUser);
    localStorage.setItem('user', JSON.stringify(safeUser));
  }

  /** Actualizar accesos en memoria y storage */
  updateAccesos(accesos: IAcceso[]) {
    const visibles = this.filtrarAccesosWeb(accesos);
    this._accesos.set(visibles);
    localStorage.setItem('accesos', JSON.stringify(visibles));
  }

  /** Actualizar empresas en memoria y storage */
  updateEmpresas(empresas: any[]) {
    this._empresas.set(empresas || []);
    localStorage.setItem('empresas', JSON.stringify(empresas || []));
  }

  /** Cambiar estado de carga de accesos */
  setAccesosLoading(loading: boolean) {
    this._accesosLoading.set(loading);
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async login(data: { userName: string; password: string }): Promise<LoginResponse | null> {
    try {
      const resp = await firstValueFrom(this.post<LoginResponse>(this.endpoints.login, data));
      if (resp.body?.success) {
        // Guardar el token antes de descargar la foto, que se pide con Authorization
        localStorage.setItem('token', resp.body.data.token || '');
        if (resp.body.data.user) {
          // Guardar usuario y, si tiene foto, descargarla y cachearla en localStorage
          const user = resp.body.data.user;
          await this.fetchAndApplyUserPhoto(user);
        }
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || 'Error al iniciar sesión', 'Error');
      return null;
    }
  }

  /**
   * Si el usuario posee photoUrl, intenta descargarla desde el backend,
   * la convierte a dataURL y la almacena en localStorage bajo clave `fotoPerfil:<userName>`.
   * También actualiza el usuario en memoria con la dataURL para uso inmediato en la UI.
   */
  async fetchAndApplyUserPhoto(user: IUsuario): Promise<IUsuario> {
    try {
      if (!user?.photoUrl) {
        this.updateUser(user);
        return user;
      }
      // Si ya es un dataURL, solo persistimos
      if (typeof user.photoUrl === 'string' && user.photoUrl.startsWith('data:')) {
        this.updateUser(user);
        return user;
      }

      const photoPath = String(user.photoUrl || '').trim();
      if (!photoPath) {
        this.updateUser(user);
        return user;
      }

      // Construir URL para obtener la foto:
      // - Si es absoluta (http/https), usarla tal cual
      // - Si NO tiene '/', asumir que es el filename y pegar a /auth/usuarios/perfil/:fileName
      // - Si tiene '/', tratarlo como ruta relativa al apiPath
      let url: string;
      const isAbsolute = /^https?:\/\//i.test(photoPath);
      if (isAbsolute) {
        url = photoPath;
      } else if (!photoPath.includes('/')) {
        url = `${environment.apiPath}/files/perfil/${encodeURIComponent(photoPath)}`;
      } else {
        const relative = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
        url = `${environment.apiPath}${relative}`;
      }

      // Preparar headers con token; NO forzar Content-Type.
      // El token solo se envía al mismo origen que la API, nunca a dominios externos.
      const token = localStorage.getItem('token') || '';
      const headers = token && this.isApiOrigin(url)
        ? new HttpHeaders({ Authorization: `Bearer ${token}` })
        : undefined;

      const blob = await firstValueFrom(
        this.httpClient.get(url, { headers, responseType: 'blob' as const })
      );

      const dataUrl = await this.blobToDataURL(blob);
      if (user.userName) {
        localStorage.setItem(`fotoPerfil:${user.userName}`, dataUrl);
      }
      const updated: IUsuario = { ...user, photoUrl: dataUrl };
      this.updateUser(updated);
      return updated;
    } catch (e) {
      // Si falla la descarga, dejamos el user como está
      this.updateUser(user);
      return user;
    }
  }

  /** Indica si la URL pertenece al mismo origen (protocolo + host + puerto) que la API */
  private isApiOrigin(url: string): boolean {
    try {
      return new URL(url, window.location.origin).origin === new URL(environment.apiPath, window.location.origin).origin;
    } catch {
      return false;
    }
  }

  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /** Verifica en el backend si el token sigue siendo válido */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const resp = await firstValueFrom(this.post<ApiResponse>(this.endpoints.verifyToken, { token }));
      return !!resp.body?.success;
    } catch (error: any) {
      return false;
    }
  }

  logout(message: string = '') {
    if (message) {
      this.toastr.error(message, 'Sesión cerrada');
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clave antigua donde también se duplicaba el usuario; se limpia en sesiones previas
    localStorage.removeItem('usuario');
    localStorage.removeItem('accesos');
    localStorage.removeItem('empresa');
    localStorage.removeItem('empresas');

    // Resetear signal del usuario
    this._user.set(this.loadUserFromStorage());
    this._accesos.set(this.loadAccesosFromStorage());
    this._empresas.set(this.loadEmpresasFromStorage());
    this._accesosLoading.set(false);
  }
}
