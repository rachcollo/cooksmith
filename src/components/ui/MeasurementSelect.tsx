import { SelectField } from './SelectField'
import {
  measurementLabels,
  measurementSystems,
  type MeasurementSystem,
} from '../../domain/measurements/purchaseMeasures'
export function MeasurementSelect({
  value,
  onChange,
  allowSource = false,
}: {
  value?: MeasurementSystem
  allowSource?: boolean
  onChange: (value: MeasurementSystem) => void
}) {
  return (
    <SelectField
      label="Cup and spoon measures"
      hint={
        allowSource
          ? 'Uses verified publisher sizes when available. Choose different sizes only if the recipe states them.'
          : 'Choose the stated sizes. Leave unspecified if you’re unsure.'
      }
      value={value ?? 'unknown'}
      onChange={(event) => onChange(event.target.value as MeasurementSystem)}
    >
      {measurementSystems.map((system) => (
        <option key={system} value={system}>
          {system === 'unknown' && !allowSource ? 'Not specified' : measurementLabels[system]}
        </option>
      ))}
    </SelectField>
  )
}
