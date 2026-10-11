import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NewCardForm, type NewCardFormProps } from '../src/components/NewCardForm';

afterEach(cleanup);

const renderForm = (overrides: Partial<NewCardFormProps> = {}) => {
  const onCreate = overrides.onCreate ?? vi.fn().mockResolvedValue(undefined);
  const onCancel = overrides.onCancel ?? vi.fn();

  render(
    <NewCardForm
      categories={overrides.categories ?? ['Inglês', 'Matemática']}
      onCreate={onCreate}
      onCancel={onCancel}
      {...(overrides.initialValues ? { initialValues: overrides.initialValues } : {})}
    />,
  );

  return { onCreate, onCancel, form: screen.getByTestId('new-card-form') };
};

const fill = (
  form: HTMLElement,
  values: { name: string; category: string; content: string },
): void => {
  fireEvent.change(within(form).getByLabelText('Nome'), {
    target: { value: values.name },
  });
  fireEvent.change(within(form).getByLabelText('Categoria'), {
    target: { value: values.category },
  });
  fireEvent.change(within(form).getByLabelText('Conteúdo'), {
    target: { value: values.content },
  });
};

const submit = (): void => {
  fireEvent.submit(screen.getByTestId('new-card-form'));
};

describe('new card form (AC1, AC2)', () => {
  it('T2.1 · renders one suggestion chip per received category', () => {
    const { form } = renderForm();

    expect(within(form).getAllByRole('button', { name: 'Inglês' })).toHaveLength(1);
    expect(within(form).getAllByRole('button', { name: 'Matemática' })).toHaveLength(1);
  });

  it('T2.2 · clicking a suggestion fills the Categoria field', () => {
    const { form } = renderForm();

    fireEvent.click(within(form).getByRole('button', { name: 'Inglês' }));

    expect((within(form).getByLabelText('Categoria') as HTMLInputElement).value).toBe('Inglês');
  });

  it('T2.3 · an unlisted category typed is preserved and submitted', async () => {
    const { onCreate, form } = renderForm();
    fill(form, { name: 'N', category: 'Alemão', content: 'C' });

    submit();

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ name: 'N', category: 'Alemão', content: 'C' }),
    );
  });
});

describe('new card form validation (AC3)', () => {
  it('T3.1 · blank or whitespace-only Nome shows the required error and does not call onCreate', async () => {
    const { onCreate, form } = renderForm();
    fill(form, { name: '   ', category: 'C', content: 'C' });

    submit();

    await screen.findByText('Informe o nome.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('T3.2 · blank or whitespace-only Conteúdo shows the required error', async () => {
    const { form } = renderForm();
    fill(form, { name: 'N', category: 'C', content: '   ' });

    submit();

    await screen.findByText('Informe o conteúdo.');
  });

  it('T3.3 · blank or whitespace-only Categoria shows the required error', async () => {
    const { form } = renderForm();
    fill(form, { name: 'N', category: '   ', content: 'C' });

    submit();

    await screen.findByText('Informe a categoria.');
  });

  it('T3.4 · Nome with 41 characters shows the size error', async () => {
    const { form } = renderForm();
    fill(form, { name: 'a'.repeat(41), category: 'C', content: 'C' });

    submit();

    await screen.findByText('O nome pode ter no máximo 40 caracteres.');
  });

  it('T3.5 · Categoria with 41 characters shows the size error', async () => {
    const { form } = renderForm();
    fill(form, { name: 'N', category: 'a'.repeat(41), content: 'C' });

    submit();

    await screen.findByText('A categoria pode ter no máximo 40 caracteres.');
  });

  it('T3.6 · Conteúdo with 5001 characters shows the size error', async () => {
    const { form } = renderForm();
    fill(form, { name: 'N', category: 'C', content: 'a'.repeat(5001) });

    submit();

    await screen.findByText('O conteúdo pode ter no máximo 5000 caracteres.');
  });
});

describe('new card form submit (AC4, AC8)', () => {
  it('T4.1 · a valid submit calls onCreate once with the trimmed values', async () => {
    const { onCreate, form } = renderForm();
    fill(form, { name: ' Nome ', category: ' Cat ', content: ' Conteudo ' });

    submit();

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith({ name: 'Nome', category: 'Cat', content: 'Conteudo' });
  });

  it('T8.1 · a rejected onCreate keeps the form open and shows a visible error', async () => {
    const { form } = renderForm({
      onCreate: vi.fn().mockRejectedValue(new Error('boom')),
    });
    fill(form, { name: 'N', category: 'C', content: 'C' });

    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente novamente.',
    );
    expect(screen.getByTestId('new-card-form')).toBeInTheDocument();
  });
});

describe('new card form initial values (AC1)', () => {
  it('T1.2 · renders the received initialValues in the fields', () => {
    const { form } = renderForm({
      initialValues: { name: 'Nome', category: 'Categoria', content: 'Conteúdo' },
    });

    expect(within(form).getByLabelText('Nome')).toHaveValue('Nome');
    expect(within(form).getByLabelText('Categoria')).toHaveValue('Categoria');
    expect(within(form).getByLabelText('Conteúdo')).toHaveValue('Conteúdo');
  });

  it('T1.3 · without initialValues the fields start empty', () => {
    const { form } = renderForm();

    expect(within(form).getByLabelText('Nome')).toHaveValue('');
    expect(within(form).getByLabelText('Categoria')).toHaveValue('');
    expect(within(form).getByLabelText('Conteúdo')).toHaveValue('');
  });
});
