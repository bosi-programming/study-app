import { type Item } from '@study/core'
import { type ItemPatch } from '../../model/editItem.ts'
import { startField } from '../field.ts'
import { type FormField, type TextField } from '../fieldTypes.ts'
import { type FormState } from './types.ts'

export const FORM_FIELDS: readonly FormField[] = ['title', 'subject', 'difficulty', 'note', 'link']

export function fieldValues(form: FormState): Readonly<Record<FormField, string>> {
  return {
    title: form.fields.title.value,
    subject: form.fields.subject.value,
    difficulty: form.fields.difficulty.value,
    note: form.fields.note.value,
    link: form.fields.link.value,
  }
}

export function emptyForm(): FormState {
  return {
    mode: 'add',
    itemId: null,
    fields: {
      title: startField(''),
      subject: startField(''),
      difficulty: startField(''),
      note: startField(''),
      link: startField(''),
    },
    baseline: { title: '', subject: '', difficulty: '', note: '', link: '' },
    focus: 'title',
  }
}

export function formOfItem(item: Item): FormState {
  const values = {
    title: item.title,
    subject: item.subject,
    difficulty: String(item.difficulty),
    note: item.note ?? '',
    link: item.link ?? '',
  }
  return {
    mode: 'edit',
    itemId: item.id,
    fields: {
      title: startField(values.title),
      subject: startField(values.subject),
      difficulty: startField(values.difficulty),
      note: startField(values.note),
      link: startField(values.link),
    },
    baseline: values,
    focus: 'title',
  }
}

export function withField(form: FormState, field: FormField, update: (value: TextField) => TextField): FormState {
  return { ...form, fields: { ...form.fields, [field]: update(form.fields[field]) } }
}

export function moveFormFocus(form: FormState, step: 1 | -1): FormState {
  const index = FORM_FIELDS.indexOf(form.focus)
  const next = Math.max(0, Math.min(FORM_FIELDS.length - 1, index + step))
  return { ...form, focus: FORM_FIELDS[next] ?? form.focus }
}

export function patchOfForm(form: FormState): ItemPatch {
  const values = fieldValues(form)
  const patch: {
    title?: string
    subject?: string
    note?: string
    link?: string
    difficulty?: number
  } = {}
  if (values.title !== form.baseline.title) patch.title = values.title
  if (values.subject !== form.baseline.subject) patch.subject = values.subject
  if (values.note !== form.baseline.note) patch.note = values.note
  if (values.link !== form.baseline.link) patch.link = values.link
  if (values.difficulty !== form.baseline.difficulty) patch.difficulty = Number(values.difficulty)
  return patch
}
