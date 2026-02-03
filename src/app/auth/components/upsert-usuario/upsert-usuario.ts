import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  effect,
  signal
} from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IUsuario, IPuesto, IRol } from '../../../../interfaces/auth';

@Component({
  selector: 'app-upsert-usuario',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-usuario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertUsuarioComponent {
  private fb = inject(FormBuilder);

  usuario = input.required<IUsuario>();
  roles = input<IRol[]>([]);
  puestos = input<IPuesto[]>([]);
  nuevo = input<boolean>(true);
  key = input<number>(0);
  autoEdit = input<boolean>(false);

  @Output() save = new EventEmitter<IUsuario>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const u = this.usuario();
      const _ = this.key();

      const newForm = this.fb.group({        
        userName: [u?.userName ?? '', [Validators.required, Validators.minLength(4)]],
        email: [u?.email ?? '', [Validators.required, Validators.email]],
        rolId: [u?.rolId ?? '', [Validators.required]],
        puestoId: [u?.puestoId ?? ''],
        active: [u?.active ?? true],
        clave: [''], // solo requerido al crear
      });

      if (isNuevo) {
        newForm.get('clave')?.addValidators([Validators.required, Validators.minLength(6)]);
        newForm.reset({          
          userName: '',
          email: '',
          rolId: '',
          puestoId: '',
          active: true,
          clave: '',
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Usuario' : 'Actualizar Usuario';
  }

  onSubmit() {
    if (this.form().valid) {
      const value: IUsuario = {
        ...this.usuario(),
        ...this.form().value,
      } as IUsuario;
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
