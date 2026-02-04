import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { AccesoService } from '../../../../services/auth/acceso.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginComponent {

  public authService = inject(AuthService);
  public accesoService = inject(AccesoService);
  // public userAliado = this.authService.getUserStorage();
  public router = inject(Router)

  userName = signal('');
  password = signal('');

  errorObj = signal<{ message: string; code: number, isError: boolean }>({
    message: '',
    code: 0,
    isError: false
  });

  loading = signal(false);

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.loading()) {
      this.login();
    }
  }

  async login() {
    // Evitar múltiples envíos mientras está cargando
    if (this.loading()) return;

    if (this.userName().trim() === '' || this.password().trim() === '') {
      this.errorObj.set({
        message: 'Por favor ingrese usuario y contraseña.',
        code: 400,
        isError: true
      });
      return;
    }

    try {
      this.loading.set(true);
      this.errorObj.set({
        message: '',
        code: 0,
        isError: false
      })

      let authData = await this.authService.login({ userName: this.userName(), password: this.password() })
      if (authData && authData.success) {
        localStorage.setItem('token', authData?.data.token || '');
        localStorage.setItem('usuario', JSON.stringify(authData?.data.user || {}));

        // Guardar empresas en el servicio y localStorage
        if (authData?.data?.empresas) {
          this.authService.updateEmpresas(authData.data.empresas);
        }

        // TO DO: Habilitar carga de accesos por rol
        // Obtener accesos por rol y guardarlos en localStorage
        // try {
        //   const rolId = authData?.data.user?.rolId || authData?.data.user?.rol?.rolId || '';
        //   if (rolId) {
        //     this.authService.setAccesosLoading(true);
        //     const accesosResp = await this.accesoService.getAccesosByRol(rolId);
        //     if (accesosResp?.data) {
        //       // Persistir y actualizar signal para que el menú lateral reaccione sin refresh
        //       localStorage.setItem('accesos', JSON.stringify(accesosResp.data));
        //       this.authService.updateAccesos(accesosResp.data);
        //     } else {
        //       // Asegurar que no haya datos obsoletos
        //       localStorage.removeItem('accesos');
        //       this.authService.updateAccesos([]);
        //     }
        //     this.authService.setAccesosLoading(false);
        //   } else {
        //     // Si no hay rol, limpiar accesos previos
        //     localStorage.removeItem('accesos');
        //     this.authService.updateAccesos([]);
        //     this.authService.setAccesosLoading(false);
        //   }
        // } catch (_) {
        //   // En caso de error ya hay notificación desde el servicio; limpiar accesos
        //   localStorage.removeItem('accesos');
        //   this.authService.updateAccesos([]);
        //   this.authService.setAccesosLoading(false);
        // }

        if (authData?.data?.empresas) {
          if (authData?.data?.empresas.length === 1) {
            localStorage.setItem('empresa', JSON.stringify(authData.data.empresas[0]));
          } else {
            // Show modal for selecting company
            this.showCompanySelectionModal(authData?.data?.empresas);
            return; // Return here to prevent immediate navigation
          }
        } else {
          // Log out the user
          this.router.navigate(['/logout']);
        }

        this.errorObj.set({
          message: '',
          code: 0,
          isError: false
        });
        this.loading.set(false);
        // Verificar si el usuario es nuevo y requiere cambio de contraseña
        if (authData?.data?.user?.new === true) {
          this.router.navigate(['/dashboard/mi-perfil'], { queryParams: { forcePasswordChange: 'true' } });
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.loading.set(false);
        this.errorObj.set({
          message: authData?.message || 'Login failed',
          code: 401,
          isError: true
        });
      }

    } catch (error: any) {
      this.loading.set(false);
      console.error('Login failed:', error);
      this.errorObj.set({
        message: error?.error?.message || 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        code: 500,
        isError: true,
      });
    }
  }

  showCompanySelectionModal(companies: any[]) {
    // Set background opacity
    const modalBackground = document.createElement('div');
    modalBackground.style.position = 'fixed';
    modalBackground.style.top = '0';
    modalBackground.style.left = '0';
    modalBackground.style.width = '100%';
    modalBackground.style.height = '100%';
    modalBackground.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalBackground.style.zIndex = '1000';

    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.innerHTML = '<h2>Seleccione una Empresa</h2>';

    companies.forEach(company => {
      const button = document.createElement('button');
      button.innerText = company.nombreEmpresa;
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '10px';
      button.style.margin = '5px 0';
      button.style.border = '1px solid #ccc';
      button.style.borderRadius = '4px';
      button.style.backgroundColor = '#f0f0f0';
      button.style.cursor = 'pointer';
      button.onmouseover = () => button.style.backgroundColor = '#e0e0e0';
      button.onmouseout = () => button.style.backgroundColor = '#f0f0f0';
      button.onclick = () => {
        localStorage.setItem('empresa', JSON.stringify(company));
        document.body.removeChild(modalBackground);
        // Verificar si el usuario es nuevo y requiere cambio de contraseña
        const user = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (user.new === true) {
          this.router.navigate(['/dashboard/mi-perfil'], { queryParams: { forcePasswordChange: 'true' } });
        } else {
          this.router.navigate(['/dashboard']);
        }
      };
      modal.appendChild(button);
    });

    const logoutButton = document.createElement('button');
    logoutButton.innerText = 'Cerrar Sesión';
    logoutButton.style.display = 'block';
    logoutButton.style.width = '100%';
    logoutButton.style.padding = '10px';
    logoutButton.style.margin = '20px 0 0';
    logoutButton.style.border = 'none';
    logoutButton.style.borderRadius = '4px';
    logoutButton.style.backgroundColor = '#f44336';
    logoutButton.style.color = 'white';
    logoutButton.style.cursor = 'pointer';
    logoutButton.onmouseover = () => logoutButton.style.backgroundColor = '#d32f2f';
    logoutButton.onmouseout = () => logoutButton.style.backgroundColor = '#f44336';
    logoutButton.onclick = () => {
      document.body.removeChild(modalBackground);
      this.authService.logout();
      this.router.navigate(['/login']);
    };
    modal.appendChild(logoutButton);

    modalBackground.appendChild(modal);
    document.body.appendChild(modalBackground);
  }
}
