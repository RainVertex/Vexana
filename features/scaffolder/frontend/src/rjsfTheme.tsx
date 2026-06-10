// Tailwind-styled RJSF templates and widgets shared by the wizard form and the editor preview.
import type { ChangeEvent, FocusEvent } from "react";
import {
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  getInputProps,
  type BaseInputTemplateProps,
  type DescriptionFieldProps,
  type FieldErrorProps,
  type FieldTemplateProps,
  type TitleFieldProps,
  type WidgetProps,
} from "@rjsf/utils";

const INPUT_CLASS =
  "w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text " +
  "focus:border-app-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

function BaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
    value,
    readonly,
    disabled,
    autofocus,
    onBlur,
    onFocus,
    onChange,
    onChangeOverride,
    options,
    schema,
    type,
    placeholder,
    required,
  } = props;
  const inputProps = getInputProps(schema, type, options);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e.target.value === "" ? options.emptyValue : e.target.value);
  return (
    <input
      id={id}
      name={id}
      className={INPUT_CLASS}
      placeholder={placeholder}
      autoFocus={autofocus}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      {...inputProps}
      value={value ?? ""}
      onChange={onChangeOverride ?? handleChange}
      onBlur={(e: FocusEvent<HTMLInputElement>) => onBlur(id, e.target.value)}
      onFocus={(e: FocusEvent<HTMLInputElement>) => onFocus(id, e.target.value)}
    />
  );
}

function SelectWidget(props: WidgetProps) {
  const {
    id,
    options,
    value,
    required,
    disabled,
    readonly,
    multiple,
    autofocus,
    onChange,
    onBlur,
    onFocus,
    placeholder,
  } = props;
  const { enumOptions = [], enumDisabled, emptyValue } = options;
  const selectedIndex = enumOptionsIndexForValue(value, enumOptions, multiple);
  return (
    <select
      id={id}
      name={id}
      className={INPUT_CLASS}
      value={typeof selectedIndex === "undefined" ? "" : String(selectedIndex)}
      required={required}
      disabled={disabled || readonly}
      autoFocus={autofocus}
      onChange={(e) => onChange(enumOptionsValueForIndex(e.target.value, enumOptions, emptyValue))}
      onBlur={(e) => onBlur(id, enumOptionsValueForIndex(e.target.value, enumOptions, emptyValue))}
      onFocus={(e) =>
        onFocus(id, enumOptionsValueForIndex(e.target.value, enumOptions, emptyValue))
      }
    >
      <option value="">{placeholder || ""}</option>
      {enumOptions.map((option, index) => (
        <option
          key={index}
          value={String(index)}
          disabled={Array.isArray(enumDisabled) && enumDisabled.includes(option.value as never)}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

function TextareaWidget(props: WidgetProps) {
  const {
    id,
    value,
    disabled,
    readonly,
    autofocus,
    placeholder,
    required,
    options,
    onChange,
    onBlur,
    onFocus,
  } = props;
  return (
    <textarea
      id={id}
      name={id}
      className={`${INPUT_CLASS} min-h-24`}
      rows={typeof options.rows === "number" ? options.rows : 4}
      placeholder={placeholder}
      autoFocus={autofocus}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? options.emptyValue : e.target.value)}
      onBlur={(e) => onBlur(id, e.target.value)}
      onFocus={(e) => onFocus(id, e.target.value)}
    />
  );
}

function CheckboxWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, label, hideLabel, onChange, onBlur, onFocus } = props;
  return (
    <label className="flex items-center gap-2 text-sm text-app-text" htmlFor={id}>
      <input
        id={id}
        name={id}
        type="checkbox"
        className="h-4 w-4 rounded border-app-border accent-app-primary"
        checked={value === true}
        disabled={disabled || readonly}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={(e) => onBlur(id, e.target.checked)}
        onFocus={(e) => onFocus(id, e.target.checked)}
      />
      {!hideLabel && label}
    </label>
  );
}

function FieldTemplate(props: FieldTemplateProps) {
  const { id, label, required, description, errors, help, children, hidden, displayLabel } = props;
  if (hidden) return <div className="hidden">{children}</div>;
  return (
    <div className="mb-4">
      {displayLabel && label ? (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-app-text">
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
        </label>
      ) : null}
      {displayLabel ? description : null}
      {children}
      {errors}
      {help}
    </div>
  );
}

function DescriptionFieldTemplate(props: DescriptionFieldProps) {
  const { id, description } = props;
  if (!description) return null;
  return (
    <p id={id} className="mb-1 text-xs text-app-text-muted">
      {description}
    </p>
  );
}

function TitleFieldTemplate(props: TitleFieldProps) {
  const { id, title, required } = props;
  return (
    <h3 id={id} className="mb-2 text-sm font-semibold text-app-text">
      {title}
      {required ? <span className="text-rose-600"> *</span> : null}
    </h3>
  );
}

function FieldErrorTemplate(props: FieldErrorProps) {
  const { errors = [], fieldPathId } = props;
  if (errors.length === 0) return null;
  return (
    <ul id={`${fieldPathId.$id}__error`} className="mt-1 space-y-0.5 text-xs text-rose-600">
      {errors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  );
}

// Field-level errors render inline, the top-of-form summary only adds noise.
function ErrorListTemplate() {
  return null;
}

export const themeTemplates = {
  BaseInputTemplate,
  FieldTemplate,
  DescriptionFieldTemplate,
  TitleFieldTemplate,
  FieldErrorTemplate,
  ErrorListTemplate,
};

export const themeWidgets = {
  SelectWidget,
  TextareaWidget,
  CheckboxWidget,
};
