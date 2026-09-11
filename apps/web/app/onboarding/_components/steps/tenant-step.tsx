import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { argentinaProvinces, referralSources } from "../../_constants/onboarding.constants";
import type { OnboardingFormState, UpdateTenant } from "../../_types/onboarding.types";
import { formatTaxId, normalizeTaxId } from "../../_utils/onboarding-format";
import { OnboardingField } from "../form/onboarding-field";
import {
  getSelectContentClassName,
  getSelectItemClassName,
  getSelectTriggerClassName
} from "../form/select-styles";

type TenantStepProps = {
  darkMode: boolean;
  form: OnboardingFormState;
  updateTenant: UpdateTenant;
};

export function TenantStep({ darkMode, form, updateTenant }: TenantStepProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OnboardingField label="Nombre de estudio juridico">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          value={form.tenant.name}
          onChange={(event) => updateTenant("name", event.currentTarget.value)}
          placeholder="Estudio Alvarez"
        />
      </OnboardingField>
      <OnboardingField label="Razon social / nombre legal">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          value={form.tenant.legalName ?? ""}
          onChange={(event) => updateTenant("legalName", event.currentTarget.value)}
          placeholder="Estudio Juridico Alvarez"
        />
      </OnboardingField>
      <OnboardingField label="CUIT / CUIL">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          inputMode="numeric"
          maxLength={13}
          pattern="[0-9-]*"
          value={formatTaxId(form.tenant.taxId)}
          onChange={(event) => updateTenant("taxId", normalizeTaxId(event.currentTarget.value))}
          placeholder="20-12345678-9"
        />
      </OnboardingField>
      <OnboardingField label="Pais">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          value={form.tenant.country}
          onChange={(event) => updateTenant("country", event.currentTarget.value)}
        />
      </OnboardingField>
      <OnboardingField label="Provincia">
        <Select
          value={form.tenant.province}
          onValueChange={(value) => updateTenant("province", value)}
        >
          <SelectTrigger className={getSelectTriggerClassName(darkMode)}>
            <SelectValue placeholder="Seleccionar provincia" />
          </SelectTrigger>
          <SelectContent
            align="start"
            className={getSelectContentClassName(darkMode)}
            position="popper"
          >
            {argentinaProvinces.map((province) => (
              <SelectItem
                key={province}
                className={getSelectItemClassName(darkMode)}
                value={province}
              >
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </OnboardingField>
      <OnboardingField label="Ciudad">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          value={form.tenant.city}
          onChange={(event) => updateTenant("city", event.currentTarget.value)}
          placeholder="San Miguel de Tucuman"
        />
      </OnboardingField>
      <OnboardingField label="Domicilio">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          value={form.tenant.address}
          placeholder="Calle 25 de Mayo 123"
          onChange={(event) => updateTenant("address", event.currentTarget.value)}
        />
      </OnboardingField>
      <OnboardingField label="Sitio web">
        <Input
          className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
          value={form.tenant.website}
          onChange={(event) => updateTenant("website", event.currentTarget.value)}
          placeholder="https://estudio.com"
        />
      </OnboardingField>
      <OnboardingField label="Como conocio TEMIS">
        <Select
          value={form.tenant.referralSource}
          onValueChange={(value) => updateTenant("referralSource", value)}
        >
          <SelectTrigger className={getSelectTriggerClassName(darkMode)}>
            <SelectValue placeholder="Seleccionar origen" />
          </SelectTrigger>
          <SelectContent
            align="start"
            className={getSelectContentClassName(darkMode)}
            position="popper"
          >
            {referralSources.map((source) => (
              <SelectItem
                key={source.value}
                className={getSelectItemClassName(darkMode)}
                value={source.value}
              >
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </OnboardingField>
    </div>
  );
}
