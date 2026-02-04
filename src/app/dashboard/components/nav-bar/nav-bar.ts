import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth.service';
import { Router } from '@angular/router';
import { CustomIconComponent } from '../../../shared/components/custom-icon/custom-icon.component';

@Component({
  selector: 'app-nav-bar',
  imports: [CustomIconComponent],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBar {

  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  conFoto = signal(false)
  public router = inject(Router)

  // esto es un signal reactivo
  public user = this.authService.user;
  public empresas = this.authService.empresas;

  //para abrir el sidebar
  @Output() openToggleSidebar = new EventEmitter<void>();

  constructor() {
    this.actualizarFoto();
  }

  async actualizarFoto() {
    if (!this.user()?.userId) return;

    // const nuevaFotoUrl = await this.fotoPerfilService.descargarFotoUsuario(this.user().usuarioId);
    // if (nuevaFotoUrl) {
    //   this.conFoto.set(true);
    //   const updatedUser = { ...this.user()!, photoUrl: nuevaFotoUrl };
    //   this.authService.updateUser(updatedUser); // 🔑 sincroniza signal
    //   this.cdr.detectChanges();
    // }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openProfile(event?: Event) {
    event?.preventDefault();
    this.router.navigate(['/dashboard/mi-perfil']);
  }

  optenToggleSidebar() {
     this.openToggleSidebar.emit();
  }

  /**
   * Abre el modal de selección de empresa si el usuario tiene más de una empresa
   */
  openCompanySelectionModal(event?: Event) {
    event?.preventDefault();
    const companies = this.empresas();
    if (companies && companies.length > 1) {
      this.showCompanySelectionModal(companies);
    }
  }

  /**
   * Muestra el modal de selección de empresa
   */
  private showCompanySelectionModal(companies: any[]) {
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
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.padding = '30px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    modal.style.maxWidth = '400px';
    modal.style.width = '90%';
    modal.style.zIndex = '1001';

    const title = document.createElement('h2');
    title.innerText = 'Cambiar Empresa';
    title.style.marginBottom = '20px';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.color = '#1e2328';
    modal.appendChild(title);

    companies.forEach(company => {
      const button = document.createElement('button');
      button.innerText = company.nombreEmpresa;
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '12px';
      button.style.margin = '8px 0';
      button.style.border = '1px solid #ddd';
      button.style.borderRadius = '6px';
      button.style.backgroundColor = '#f8f9fa';
      button.style.cursor = 'pointer';
      button.style.fontSize = '14px';
      button.style.transition = 'all 0.2s ease';
      button.onmouseover = () => {
        button.style.backgroundColor = '#e9ecef';
        button.style.borderColor = '#0066cc';
      };
      button.onmouseout = () => {
        button.style.backgroundColor = '#f8f9fa';
        button.style.borderColor = '#ddd';
      };
      button.onclick = () => {
        localStorage.setItem('empresa', JSON.stringify(company));
        document.body.removeChild(modalBackground);
        // Recargar la página para actualizar todos los datos relacionados con la empresa
        window.location.reload();
      };
      modal.appendChild(button);
    });

    const closeButton = document.createElement('button');
    closeButton.innerText = 'Cancelar';
    closeButton.style.display = 'block';
    closeButton.style.width = '100%';
    closeButton.style.padding = '12px';
    closeButton.style.margin = '20px 0 0';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '6px';
    closeButton.style.backgroundColor = '#f0f0f0';
    closeButton.style.color = '#666';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    closeButton.style.transition = 'all 0.2s ease';
    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = '#e0e0e0';
    };
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = '#f0f0f0';
    };
    closeButton.onclick = () => {
      document.body.removeChild(modalBackground);
    };
    modal.appendChild(closeButton);

    modalBackground.appendChild(modal);
    modalBackground.onclick = (e) => {
      if (e.target === modalBackground) {
        document.body.removeChild(modalBackground);
      }
    };
    document.body.appendChild(modalBackground);
  }


}
