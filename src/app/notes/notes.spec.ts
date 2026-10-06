import { screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FakeAuthSession } from '../auth/testing/fake-auth-session';
import { renderApp } from '../testing/render-app';
import { NotesData } from './notes-data';
import { FakeNotesData } from './testing/fake-notes-data';

async function addNote(text: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('New note'), text);
  await user.click(screen.getByRole('button', { name: 'Add note' }));
}

describe('Notes', () => {
  it('opens from home', async () => {
    await renderApp('/', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: new FakeNotesData({ notes: ['Buy milk'] }) }],
    });

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Notes' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Notes' })).toBeVisible();
    expect(await screen.findByRole('listitem', { name: 'Buy milk' })).toBeVisible();
  });

  it('sends signed-out visitors to sign-in', async () => {
    await renderApp('/notes', {
      providers: [{ provide: NotesData, useValue: new FakeNotesData() }],
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('lists the notes, newest first', async () => {
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [
        { provide: NotesData, useValue: new FakeNotesData({ notes: ['Call Grace', 'Buy milk'] }) },
      ],
    });

    const older = await screen.findByRole('listitem', { name: 'Buy milk' });

    expect(screen.getAllByRole('listitem')).toEqual([
      screen.getByRole('listitem', { name: 'Call Grace' }),
      older,
    ]);
  });

  it('says when there are no notes yet', async () => {
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: new FakeNotesData() }],
    });

    expect(await screen.findByText('No notes yet.')).toBeVisible();
  });

  it("says so when the notes can't be loaded", async () => {
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: new FakeNotesData({ loadFails: true }) }],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your notes couldn't be loaded. Reload the page to try again.",
    );
  });

  it('adds a note on top of the list and clears the field', async () => {
    const notes = new FakeNotesData({ notes: ['Buy milk'] });
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });

    await addNote('Call Grace');

    const added = await screen.findByRole('listitem', { name: 'Call Grace' });
    expect(screen.getAllByRole('listitem')).toEqual([
      added,
      screen.getByRole('listitem', { name: 'Buy milk' }),
    ]);
    expect(screen.getByLabelText('New note')).toHaveValue('');
    expect(screen.getByLabelText('New note')).toBeValid();
  });

  it('adds the note without surrounding spaces', async () => {
    const notes = new FakeNotesData();
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });

    await addNote('  Call Grace  ');

    expect(await screen.findByRole('listitem', { name: 'Call Grace' })).toBeVisible();
    expect(notes.notes()?.map(({ text }) => text)).toEqual(['Call Grace']);
  });

  it('asks for some text instead of adding a blank note', async () => {
    const notes = new FakeNotesData();
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });

    await addNote('   ');

    expect(await screen.findByText('Write something first.')).toBeVisible();
    expect(screen.getByLabelText('New note')).toBeInvalid();
    expect(notes.notes()).toEqual([]);
  });

  it('takes at most 1000 characters for a note', async () => {
    const notes = new FakeNotesData();
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });

    await addNote('x'.repeat(1001));

    expect(await screen.findByRole('listitem', { name: 'x'.repeat(1000) })).toBeVisible();
  });

  it('changes a note', async () => {
    const notes = new FakeNotesData({ notes: ['Buy milk'] });
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });
    const user = userEvent.setup();
    const note = await screen.findByRole('listitem', { name: 'Buy milk' });

    await user.click(within(note).getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Note'));
    await user.type(screen.getByLabelText('Note'), ' Buy oat milk ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('listitem', { name: 'Buy oat milk' })).toBeVisible();
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument();
    expect(notes.notes()?.map(({ text }) => text)).toEqual(['Buy oat milk']);
  });

  it('puts the cursor in the note to change', async () => {
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: new FakeNotesData({ notes: ['Buy milk'] }) }],
    });
    const note = await screen.findByRole('listitem', { name: 'Buy milk' });

    await userEvent.setup().click(within(note).getByRole('button', { name: 'Edit' }));

    expect(await screen.findByLabelText('Note')).toHaveFocus();
    expect(screen.getByLabelText('Note')).toHaveValue('Buy milk');
  });

  it('keeps the note as it was when the change is cancelled', async () => {
    const notes = new FakeNotesData({ notes: ['Buy milk'] });
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });
    const user = userEvent.setup();
    const note = await screen.findByRole('listitem', { name: 'Buy milk' });

    await user.click(within(note).getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Note'), ' and eggs');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('listitem', { name: 'Buy milk' })).toBeVisible();
    expect(notes.notes()?.map(({ text }) => text)).toEqual(['Buy milk']);
  });

  it('asks for some text instead of saving a blank note', async () => {
    const notes = new FakeNotesData({ notes: ['Buy milk'] });
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });
    const user = userEvent.setup();
    const note = await screen.findByRole('listitem', { name: 'Buy milk' });

    await user.click(within(note).getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Note'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Write something first.')).toBeVisible();
    expect(screen.getByLabelText('Note')).toBeInvalid();
    expect(notes.notes()?.map(({ text }) => text)).toEqual(['Buy milk']);
  });

  it('deletes a note', async () => {
    const notes = new FakeNotesData({ notes: ['Call Grace', 'Buy milk'] });
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });
    const note = await screen.findByRole('listitem', { name: 'Buy milk' });

    await userEvent.setup().click(within(note).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(note).not.toBeInTheDocument());
    expect(screen.getByRole('listitem', { name: 'Call Grace' })).toBeVisible();
    expect(notes.notes()?.map(({ text }) => text)).toEqual(['Call Grace']);
  });

  it('shows a note added elsewhere, e.g. in another tab', async () => {
    const notes = new FakeNotesData({ notes: ['Buy milk'] });
    await renderApp('/notes', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      providers: [{ provide: NotesData, useValue: notes }],
    });
    await screen.findByRole('listitem', { name: 'Buy milk' });

    notes.createElsewhere('Call Grace');

    expect(await screen.findByRole('listitem', { name: 'Call Grace' })).toBeVisible();
  });
});
