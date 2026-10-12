import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test } from 'vitest'
import { parseWeight, WeightInput } from './WeightInput'

test('parseWeight accepte la virgule, refuse vide et négatif', () => {
  expect(parseWeight('62,5')).toBe(62.5)
  expect(parseWeight('62.5')).toBe(62.5)
  expect(parseWeight('')).toBeNull()
  expect(parseWeight('-5')).toBeNull()
  expect(parseWeight('abc')).toBeNull()
})

test('saisie « 62,5 » : la valeur remonte, le texte reste', async () => {
  let last = 0
  function Host() {
    const [kg, setKg] = useState(60)
    return (
      <>
        <WeightInput aria-label="Charge" value={kg} onChange={(v) => setKg((last = v))} />
        <button onClick={() => setKg((k) => k + 2.5)}>plus</button>
      </>
    )
  }
  render(<Host />)
  const input = screen.getByLabelText('Charge')
  await userEvent.clear(input)
  expect(last).toBe(0) // champ vidé : rien ne remonte
  await userEvent.type(input, '62,5')
  expect(last).toBe(62.5)
  expect(input).toHaveValue('62,5')
  await userEvent.click(screen.getByText('plus'))
  expect(input).toHaveValue('65')
})
