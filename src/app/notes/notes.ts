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
import { FormField, form, maxLength, schema, submit, validate } from '@angular/forms/signals';
import { NotesData } from './notes-data';
import { Note, maxNoteLength } from './note.model';

interface NoteForm {
  text: string;
}

// For new notes and changed ones alike.
const noteSchema = schema<NoteForm>((path) => {
  validate(path.text, ({ value }) =>
    value().trim() ? undefined : { kind: 'required', message: 'Write something first.' },
  );
  maxLength(path.text, maxNoteLength, { message: `Use at most ${maxNoteLength} characters.` });
});

@Component({
  selector: 'app-notes',
  imports: [FormField, RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <h1 class="text-3xl font-bold tracking-tight">Notes</h1>
      @if (notesData.loadFailed()) {
        <p role="alert" class="text-red-700">
          Your notes couldn't be loaded. Reload the page to try again.
        </p>
      } @else if (notesData.notes(); as notes) {
        <form novalidate class="flex flex-col gap-2" (submit)="addNote(); $event.preventDefault()">
          @let newText = newNoteForm.text();
          <label class="flex flex-col gap-1">
            New note
            <textarea
              rows="3"
              aria-describedby="new-note-errors"
              class="rounded border border-slate-300 px-3 py-2"
              [attr.aria-invalid]="newText.touched() && newText.invalid()"
              [formField]="newNoteForm.text"
            ></textarea>
          </label>
          <div id="new-note-errors">
            @if (newText.touched()) {
              @for (error of newText.errors(); track error.kind) {
                <p class="text-sm text-red-700">{{ error.message }}</p>
              }
            }
          </div>
          <button
            type="submit"
            class="self-start rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
            [disabled]="newNoteForm().submitting()"
          >
            Add note
          </button>
        </form>
        @if (notes.length === 0) {
          <p class="text-slate-600">No notes yet.</p>
        } @else {
          <ul class="flex flex-col gap-3">
            @for (note of notes; track note.id) {
              <li
                class="flex flex-col gap-2 rounded border border-slate-200 p-3"
                [attr.aria-labelledby]="'note-' + note.id"
              >
                @if (editingId() === note.id) {
                  <form
                    novalidate
                    class="flex flex-col gap-2"
                    (submit)="saveNote(note.id); $event.preventDefault()"
                  >
                    @let editText = editForm.text();
                    <label class="flex flex-col gap-1">
                      Note
                      <textarea
                        #editTextarea
                        rows="3"
                        aria-describedby="edit-note-errors"
                        class="rounded border border-slate-300 px-3 py-2"
                        [attr.aria-invalid]="editText.touched() && editText.invalid()"
                        [formField]="editForm.text"
                      ></textarea>
                    </label>
                    <div id="edit-note-errors">
                      @if (editText.touched()) {
                        @for (error of editText.errors(); track error.kind) {
                          <p class="text-sm text-red-700">{{ error.message }}</p>
                        }
                      }
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="submit"
                        class="rounded bg-slate-900 px-3 py-1 font-medium text-white disabled:opacity-50"
                        [disabled]="editForm().submitting()"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        class="rounded border border-slate-300 px-3 py-1 font-medium"
                        (click)="editingId.set(undefined)"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                } @else {
                  <p class="whitespace-pre-wrap" [id]="'note-' + note.id">{{ note.text }}</p>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded border border-slate-300 px-3 py-1 font-medium"
                      (click)="startEditing(note)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="rounded border border-slate-300 px-3 py-1 font-medium"
                      (click)="notesData.delete(note.id)"
                    >
                      Delete
                    </button>
                  </div>
                }
              </li>
            }
          </ul>
        }
      } @else {
        <p class="text-slate-600">Loading your notes…</p>
      }
      <a routerLink="/" class="underline">Back to home</a>
    </main>
  `,
})
export class Notes {
  protected readonly notesData = inject(NotesData);
  readonly #injector = inject(Injector);

  protected readonly newNoteForm = form(signal<NoteForm>({ text: '' }), noteSchema);

  /** The note being changed, if any; one at a time. */
  protected readonly editingId = signal<string | undefined>(undefined);
  protected readonly editForm = form(signal<NoteForm>({ text: '' }), noteSchema);
  // Not `#editTextarea`: Angular's queries can't use ES private fields.
  private readonly editTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('editTextarea');

  protected addNote(): void {
    submit(this.newNoteForm, async () => {
      await this.notesData.create(this.newNoteForm.text().value().trim());
      this.newNoteForm().reset({ text: '' });
    });
  }

  protected startEditing(note: Note): void {
    this.editForm().reset({ text: note.text });
    this.editingId.set(note.id);
    // The Edit button is gone once the form shows; keep keyboard users where they were.
    afterNextRender(() => this.editTextarea()?.nativeElement.focus(), {
      injector: this.#injector,
    });
  }

  protected saveNote(id: string): void {
    submit(this.editForm, async () => {
      await this.notesData.update(id, this.editForm.text().value().trim());
      this.editingId.set(undefined);
    });
  }
}
