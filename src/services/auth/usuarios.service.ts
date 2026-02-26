import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiResponse } from '../../interfaces/api-response';
import { IUsuario } from '../../interfaces/auth';
import { environment } from '../../environments/environment';
import { HttpHeaders } from '@angular/common/http';

type UsuarioResponse = ApiResponse<IUsuario>;
type UsuarioListResponse = ApiResponse<IUsuario[]>;

@Injectable({ providedIn: 'root' })
export class UsuariosService extends HttpService {
  private readonly endpoints = {
    usuarios: '/aliado/usuario',
    cambiarClave: '/aliado/cambiar-clave',
    files: '/files'
  };

  private httpClient: HttpClient;
  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
    this.httpClient = http;
  }

  async getUsuarios({ page = 1, limit = 10, busqueda = '', all = false , puestoNombre = ''} = {}): Promise<UsuarioListResponse | null> {
    try {
      // Obtener empresaId del localStorage
      let empresaId: string | undefined;
      const empresaData = localStorage.getItem('empresa');
      if (empresaData) {
        try {
          const empresa = JSON.parse(empresaData);
          empresaId = empresa.empresaId;
        } catch (error) {
          console.error('Error al parsear datos de empresa del localStorage:', error);
        }
      }

      let params: any = { page, limit, busqueda, empresaId };
      if (all) params = { ...params, all: all };
      if (puestoNombre) params = { ...params, puestoNombre}
      const resp = await firstValueFrom(this.get<UsuarioListResponse>(`${this.endpoints.usuarios}`, params));
      if (resp.body?.success) return resp.body;
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ getUsuarios ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener usuarios', 'Error');
      return null;
    }
  }

  async getUsuario(usuarioId: string): Promise<UsuarioResponse | null> {
    try {
      const resp = await firstValueFrom(this.get<UsuarioResponse>(`${this.endpoints.usuarios}/${usuarioId}`));
      if (resp.body?.success) return resp.body;
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ getUsuario ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al obtener usuario', 'Error');
      return null;
    }
  }

  async createUsuario(usuario: Omit<IUsuario, 'usuarioId' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<UsuarioResponse | null> {
    try {
      // Obtener empresaId del localStorage
      let empresaId: string | undefined;
      const empresaData = localStorage.getItem('empresa');
      if (empresaData) {
        try {
          const empresa = JSON.parse(empresaData);
          empresaId = empresa.empresaId;
        } catch (error) {
          console.error('Error al parsear datos de empresa del localStorage:', error);
        }
      }
      
      const { fullName, userName, email, rolId, active, password } = usuario;
      const resp = await firstValueFrom(this.post<ApiResponse<{ usuario: IUsuario }>>(`${this.endpoints.usuarios}`, {
        fullName, userName, email, rolId, empresaId, active, password
      }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return { ...resp.body, data: (resp.body.data as any)?.usuario ?? resp.body.data } as UsuarioResponse;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ createUsuario ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al crear usuario', 'Error');
      return null;
    }
  }

  async updateUsuario(usuario: IUsuario): Promise<UsuarioResponse | null> {
    try {
      const { userId, fullName, userName, email, rolId, active, created_at } = usuario;
      const resp = await firstValueFrom(this.put<ApiResponse<{ usuario: IUsuario }>>(`${this.endpoints.usuarios}`, {
        userId, fullName, userName, email, rolId, active, created_at: created_at || new Date().toISOString()
      }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return { ...resp.body, data: (resp.body.data as any)?.usuario ?? resp.body.data } as UsuarioResponse;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ updateUsuario ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al actualizar usuario', 'Error');
      return null;
    }
  }

  async deleteUsuario(usuarioId: string): Promise<UsuarioResponse | null> {
    try {
      const resp = await firstValueFrom(this.delete<UsuarioResponse>(`${this.endpoints.usuarios}/${usuarioId}`));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ deleteUsuario ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al eliminar usuario', 'Error');
      return null;
    }
  }

  async cambiarClave(userId: string, current: string, newPassword: string): Promise<ApiResponse | null> {
    try {
      const resp = await firstValueFrom(this.post<ApiResponse>(`${this.endpoints.cambiarClave}`, { userId, current, newPassword }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Contraseña actualizada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ cambiarClave ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al cambiar contraseña', 'Error');
      return null;
    }
  }

  /**
   * Sube la imagen de perfil vía multipart/form-data.
   * Campo de archivo: 'file', incluye además 'userName'.
   * No usar HttpService.headers por el Content-Type JSON; dejamos que el navegador setee el boundary.
   */
  async uploadPerfil(file: File, userName: string): Promise<ApiResponse<{ filename: string; path: string }> | null> {
    try {
      const form = new FormData();
      // Forzar que el nombre físico sea el userName conservando la extensión del archivo original
      const originalName = file.name;
      const dotIdx = originalName.lastIndexOf('.')
      const ext = dotIdx !== -1 ? originalName.substring(dotIdx) : '';
      const forcedName = `${userName}${ext}`;
      form.append('file', file, forcedName);
      form.append('userName', userName);

      const token = localStorage.getItem('token') || '';
      const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
      const url = environment.apiPath + `${this.endpoints.files}/upload-perfil`;

      const resp = await firstValueFrom(this.httpClient.post<ApiResponse<{ filename: string; path: string }>>(url, form, {
        headers,
        observe: 'response'
      }));

      if (resp.body?.success) {
        this.toastr.success(resp.body.message || 'Imagen de perfil subida', 'Éxito');
        return resp.body as any;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ UsuariosService ~ uploadPerfil ~ error:', error);
      this.toastr.error(error?.error?.message || 'Error al subir imagen de perfil', 'Error');
      return null;
    }
  }
}
