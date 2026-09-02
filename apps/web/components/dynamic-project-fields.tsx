import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectField } from "@/lib/project-types";

const FIELD_NAME_PREFIX = "field__";

export function customFieldInputName(key: string): string {
  return `${FIELD_NAME_PREFIX}${key}`;
}

export function readCustomFieldValue(
  formData: FormData,
  key: string
): string {
  return String(formData.get(customFieldInputName(key)) ?? "");
}

/**
 * Renders a project type's field_schema as plain form inputs. Uncontrolled on
 * purpose so it works the same inside the create form and the details form.
 */
export function DynamicProjectFields({
  idPrefix,
  fields,
  values,
  disabled = false,
}: {
  idPrefix: string;
  fields: ProjectField[];
  values: Record<string, string>;
  disabled?: boolean;
}) {
  if (fields.length === 0) {
    return (
      <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
        Denne prosjekttypen har ingen felter ennå. Legg dem til under
        Innstillinger → Prosjekttyper.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const inputId = `${idPrefix}-${field.key}`;
        const name = customFieldInputName(field.key);
        const value = values[field.key] ?? "";
        const wide = field.type === "textarea";

        return (
          <div
            key={field.key}
            className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}
          >
            <Label htmlFor={inputId}>
              {field.label}
              {field.required ? (
                <span className="text-muted-foreground"> *</span>
              ) : null}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={inputId}
                name={name}
                defaultValue={value}
                required={field.required}
                disabled={disabled}
                className="min-h-24"
              />
            ) : field.type === "select" ? (
              <select
                id={inputId}
                name={name}
                defaultValue={value}
                required={field.required}
                disabled={disabled}
                className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="">Ikke valgt</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={inputId}
                name={name}
                type={inputTypeFor(field.type)}
                step={field.type === "number" ? "any" : undefined}
                defaultValue={value}
                required={field.required}
                disabled={disabled}
                className="h-10"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function inputTypeFor(type: ProjectField["type"]): string {
  if (type === "email") {
    return "email";
  }
  if (type === "number") {
    return "number";
  }
  if (type === "date") {
    return "date";
  }
  // URL fields stay text so partial values like "gammelside.no" are accepted.
  return "text";
}
