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
import { FormField, form, schema, submit, validate } from '@angular/forms/signals';
import { NotesData } from './notes-data';
import { Note, maxNoteLength } from './note.model';

interface NoteForm {
  text: string;
}

const noteSchema = schema<NoteForm>((path) => {
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
  imports: [FormField, RouterLink],
  templateUrl: './notes.html',
})
export class Notes {
  protected readonly notesData = inject(NotesData);
  readonly #injector = inject(Injector);

  protected readonly newNoteForm = form(signal<NoteForm>({ text: '' }), noteSchema);

  protected readonly editingId = signal<string | undefined>(undefined);
  protected readonly editNoteForm = form(signal<NoteForm>({ text: '' }), noteSchema);
  private readonly editTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('editTextarea');

  protected addNote(): void {
    submit(this.newNoteForm, async () => {
      await this.notesData.create(this.newNoteForm.text().value().trim());
      this.newNoteForm().reset({ text: '' });
    });
  }

  protected startEditing(note: Note): void {
    this.editNoteForm().reset({ text: note.text });
    this.editingId.set(note.id);
    this.#keepKeyboardUsersInTheNoteOnceItsEditButtonIsGone();
  }

  protected saveNote(id: string): void {
    submit(this.editNoteForm, async () => {
      await this.notesData.update(id, this.editNoteForm.text().value().trim());
      this.editingId.set(undefined);
    });
  }

  #keepKeyboardUsersInTheNoteOnceItsEditButtonIsGone(): void {
    afterNextRender(() => this.editTextarea()?.nativeElement.focus(), {
      injector: this.#injector,
    });
  }
}
