import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormField,
  FormRoot,
  TreeValidationResult,
  form,
  schema,
  validate,
} from '@angular/forms/signals';
import { NotesData } from './notes-data';
import { Note, maxNoteLength } from './note.model';

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

@Component({
  selector: 'app-notes',
  imports: [FormField, FormRoot, RouterLink],
  templateUrl: './notes.html',
})
export class Notes {
  protected readonly notesData = inject(NotesData);
  readonly #injector = inject(Injector);

  readonly #newNoteModel = signal<NoteModel>({ text: '' });
  protected readonly newNoteForm = form(this.#newNoteModel, noteSchema, {
    submission: {
      action: async (form): Promise<TreeValidationResult> => {
        await this.notesData.create(this.#newNoteModel().text.trim());
        form().reset({ text: '' });
      },
    },
  });

  protected readonly editingId = signal<string | undefined>(undefined);
  readonly #editNoteModel = signal<NoteModel>({ text: '' });
  protected readonly editNoteForm = form(this.#editNoteModel, noteSchema, {
    submission: {
      action: async (): Promise<TreeValidationResult> => {
        const id = this.editingId();
        if (id) {
          await this.notesData.update(id, this.#editNoteModel().text.trim());
        }
        this.editingId.set(undefined);
      },
    },
  });
  private readonly editTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('editTextarea');

  protected startEditing(note: Note): void {
    this.editNoteForm().reset({ text: note.text });
    this.editingId.set(note.id);
    this.#keepKeyboardUsersInTheNoteOnceItsEditButtonIsGone();
  }

  #keepKeyboardUsersInTheNoteOnceItsEditButtonIsGone(): void {
    afterNextRender(() => this.editTextarea()?.nativeElement.focus(), {
      injector: this.#injector,
    });
  }
}
