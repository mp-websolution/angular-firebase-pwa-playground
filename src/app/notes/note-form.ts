import {
  Component,
  Injector,
  OnInit,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  TreeValidationResult,
  form,
  schema,
  validate,
} from '@angular/forms/signals';
import { maxNoteLength } from './note.model';

interface NoteModel {
  text: string;
}

const noteSchema = schema<NoteModel>((path) => {
  validate(path.text, ({ value }) => {
    const text = value().trim();
    if (!text) {
      return { kind: 'required', message: 'Write something first.' };
    }
    return text.length > maxNoteLength
      ? { kind: 'maxLength', message: `Use at most ${maxNoteLength} characters.` }
      : undefined;
  });
});

let nextId = 0;

@Component({
  selector: 'app-note-form',
  imports: [FormField, FormRoot],
  templateUrl: './note-form.html',
})
export class NoteForm implements OnInit {
  readonly label = input.required<string>();
  readonly submitLabel = input.required<string>();
  readonly text = input('');
  readonly autofocus = input(false, { transform: booleanAttribute });
  readonly noteSubmit = input.required<(text: string) => Promise<void>>();

  readonly #injector = inject(Injector);

  protected readonly errorsId = `note-errors-${nextId++}`;
  readonly #noteModel = signal<NoteModel>({ text: '' });
  protected readonly noteForm = form(this.#noteModel, noteSchema, {
    submission: {
      action: () => this.#saveNote(),
    },
  });

  constructor() {
    this.#focusTheNoteOnceItRendersIfAsked();
  }

  ngOnInit(): void {
    this.#noteModel.set({ text: this.text() });
  }

  async #saveNote(): Promise<TreeValidationResult> {
    await this.noteSubmit()(this.#noteModel().text.trim());
    this.noteForm().reset({ text: '' });
  }

  #focusTheNoteOnceItRendersIfAsked(): void {
    afterNextRender(
      () => {
        if (this.autofocus()) {
          this.noteForm.text().focusBoundControl();
        }
      },
      { injector: this.#injector },
    );
  }
}
