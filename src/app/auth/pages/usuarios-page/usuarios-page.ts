import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { UsuariosService } from '../../../../services/auth/usuarios.service';
import { IUsuario, IRol, IPuesto } from '../../../../interfaces/auth';
import { UpsertUsuarioComponent } from '../../components/upsert-usuario/upsert-usuario';
import { RolService } from '../../../../services/auth/rol.service';
import { PuestoService } from '../../../../services/auth/puesto.service';
import { CustomIconComponent } from '../../../shared/components/custom-icon/custom-icon.component';

const emptyUsuario: IUsuario = {
  userId: '',
  fullName: '',
  userName: '',
  password: '',
  email: '',
  lastPasswordUpdate: new Date(),
  active: true,
  rolId: '',
  puestoId: '',
  created_at: new Date(),
};

@Component({
  selector: 'app-usuarios-page',
  imports: [RouterLink, PaginationComponent, UpsertUsuarioComponent, CustomIconComponent],
  templateUrl: './usuarios-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UsuariosPageComponent {
  usuariosService = inject(UsuariosService);
  rolService = inject(RolService);

  usuariosList = signal<IUsuario[]>([]);
  rolesList = signal<IRol[]>([]);

  // Computed signal que filtra usuarios no admin
  usuariosFiltrados = computed(() => {
    return this.usuariosList().filter(u => !u.rol?.esAdmin);
  });

  // Computed signal que filtra roles que no contengan "repre" en el nombre
  rolesFiltrados = computed(() => {
    return this.rolesList().filter(rol => !rol.nombre?.toLowerCase().includes('repre'));
  });

  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });
  isLoading = signal(false);
  buscador = signal('');

  nuevoUsuario = signal(true);
  usuarioEdit = signal<IUsuario>({ ...emptyUsuario });

  formKey = signal(Date.now());
  modal = signal({ titulo: 'Crear Usuario', visible: false });

  changePassUsuario = signal<IUsuario | null>(null);
  changePassNewPass = signal('');
  changePassConfirm = signal('');
  changePassLoading = signal(false);
  changePassShowNew = signal(false);
  changePassShowConfirm = signal(false);

  @ViewChild('upsertModal', { static: true }) upsertModal!: ElementRef<HTMLDivElement>;
  @ViewChild('deleteModal', { static: true }) deleteModal!: ElementRef<HTMLDivElement>;
  @ViewChild('changePassModal', { static: true }) changePassModal!: ElementRef<HTMLDivElement>;

  async ngOnInit() {
    await this.fetchRolesYPuestos();
    this.fetchData();
  }

  ngAfterViewInit() {
    this.initializePreline();
  }

  private initializePreline() {
    if (typeof window !== 'undefined' && (window as any).HSStaticMethods) {
      setTimeout(() => (window as any).HSStaticMethods.autoInit(), 100);
    }
  }

  async fetchRolesYPuestos() {
    const [rolesResp] = await Promise.all([
      this.rolService.getRoles(),
    ]);
    if (rolesResp?.success) this.rolesList.set(rolesResp.data || []);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    const resp = await this.usuariosService.getUsuarios({
      page: this.pagination().page,
      limit: this.pagination().pageSize,
      busqueda: this.buscador()
    });
    if (resp?.success) {
      this.usuariosList.set(resp.data || []);
      if (resp.metadata) {
        this.pagination.update(p => ({ ...p, totalItems: resp.metadata?.total || 0 }));
      }
      setTimeout(() => (window as any).HSStaticMethods?.autoInit(), 100);
    }
    this.isLoading.set(false);
  }

  onSearch(term: string) {
    this.buscador.set(term);
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.fetchData();
  }

  onChangePage(newPagination: IPagination) {
    this.usuariosList.set([]);
    this.pagination.set(newPagination);
    this.fetchData();
  }

  openUpsertModal(nuevo: boolean, usuario: IUsuario = emptyUsuario) {
    this.formKey.set(Date.now());
    this.nuevoUsuario.set(nuevo);
    this.usuarioEdit.set({ ...usuario });
    this.modal.update(m => ({ ...m, titulo: nuevo ? 'Crear Usuario' : 'Editar Usuario', visible: true }));

    const modalEl = this.upsertModal.nativeElement;
    if ((window as any).HSOverlay) new (window as any).HSOverlay(modalEl).open();
    else {
      modalEl.classList.remove('hidden');
      modalEl.classList.add('pointer-events-auto');
    }
  }

  openDeleteModal(usuario: IUsuario) {
    this.usuarioEdit.set({ ...usuario });
    const modalEl = this.deleteModal.nativeElement;
    if ((window as any).HSOverlay) new (window as any).HSOverlay(modalEl).open();
    else {
      modalEl.classList.remove('hidden');
      modalEl.classList.add('pointer-events-auto');
    }
  }

  closeModal() {
    const modalEl = this.upsertModal.nativeElement;
    const modalDEl = this.deleteModal.nativeElement;
    if ((window as any).HSOverlay) {
      (window as any).HSOverlay.close(modalEl);
      (window as any).HSOverlay.close(modalDEl);
    } else {
      modalEl.classList.add('hidden');
      modalEl.classList.remove('open', 'pointer-events-auto');
      modalDEl.classList.add('hidden');
      modalDEl.classList.remove('open', 'pointer-events-auto');
    }
  }

  openChangePassModal(usuario: IUsuario) {
    this.changePassUsuario.set(usuario);
    this.changePassNewPass.set('');
    this.changePassConfirm.set('');
    this.changePassShowNew.set(false);
    this.changePassShowConfirm.set(false);
    const modalEl = this.changePassModal.nativeElement;
    if ((window as any).HSOverlay) new (window as any).HSOverlay(modalEl).open();
    else {
      modalEl.classList.remove('hidden');
      modalEl.classList.add('pointer-events-auto');
    }
  }

  closeChangePassModal() {
    const modalEl = this.changePassModal.nativeElement;
    if ((window as any).HSOverlay) (window as any).HSOverlay.close(modalEl);
    else {
      modalEl.classList.add('hidden');
      modalEl.classList.remove('open', 'pointer-events-auto');
    }
  }

  async submitChangePass() {
    const newPass = this.changePassNewPass();
    const confirm = this.changePassConfirm();
    const usuario = this.changePassUsuario();
    if (!usuario || !newPass || !confirm) return;
    if (newPass !== confirm) return;
    this.changePassLoading.set(true);
    const resp = await this.usuariosService.cambiarClaveAdmin(usuario.userId!, newPass);
    this.changePassLoading.set(false);
    if (resp?.success) this.closeChangePassModal();
  }

  async upsertUsuario(usuario: IUsuario) {
    if (!usuario.userId) await this.createUsuario(usuario);
    else await this.updateUsuario(usuario);
  }

  async createUsuario(usuario: IUsuario) {
    const { userId, created_at, updated_at, deleted_at, ...payload } = usuario;
    const resp = await this.usuariosService.createUsuario(payload as any);
    if (resp?.success) {
      this.closeModal();
      this.usuarioEdit.set({ ...emptyUsuario });
      this.nuevoUsuario.set(true);
      // Releer desde el API para traer el usuario completo (rol, nombre, etc.)
      this.fetchData();
    }
  }

  async updateUsuario(usuario: IUsuario) {
    const resp = await this.usuariosService.updateUsuario(usuario);
    if (resp?.success) {
      // Actualizar el usuario en la lista local sin recargar toda la tabla
      const usuarioActualizado = resp.data ?? usuario;
      console.log("🚀 ~ UsuariosPageComponent ~ updateUsuario ~ usuarioActualizado:", usuarioActualizado)
      this.usuariosList.update(usuarios => 
        usuarios.map(u => u.userId === usuarioActualizado.userId ? usuarioActualizado : u)
      );
      
      this.closeModal();
    }
  }

  async deleteUsuario(usuario: IUsuario) {
    const resp = await this.usuariosService.deleteUsuario(usuario.userId || '');
    if (resp?.success) {
      this.fetchData();
      this.closeModal();
      this.usuarioEdit.set({ ...emptyUsuario });
      this.nuevoUsuario.set(true);
    }
  }

  // Helpers para el template (evitar arrow functions en expresiones)
  getRolName(rolId: string): string {
    const r = (this.rolesList() || []).find(r => r.rolId === rolId);
    return r?.nombre ?? '-';
  }

   /**
 * Alterna el estado activo/inactivo de un usuario
 */
  async toggleStatus(usuario: IUsuario, status: boolean) {
    const updatedUsuario: IUsuario = {
      ...usuario,
      active: status
    };
    this.updateUsuario(updatedUsuario);
  }
}
