import type { FormEvent, ReactNode } from "react";
import type { CreateAccountFormValues } from "@/lib/validation/auth";

export type CreateAccountFieldName = keyof CreateAccountFormValues;

export type CreateAccountFieldErrors = Partial<Record<CreateAccountFieldName, string>>;

export type CreateAccountFieldConfig = {
  name: CreateAccountFieldName;
  label: string;
  placeholder: string;
  autoComplete: string;
  inputMode?: "email" | "tel" | "text";
  type?: "email" | "password" | "text";
};

export type UseCreateAccountFormResult = {
  form: CreateAccountFormValues;
  fieldErrors: CreateAccountFieldErrors;
  error: string | null;
  submitting: boolean;
  googleSubmitting: boolean;
  transitionExiting: boolean;
  transitionSuccess: boolean;
  showPassword: boolean;
  showGoogleSetupError: () => void;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  submitGoogle: (credential: string) => Promise<void>;
  togglePasswordVisibility: () => void;
  updateField: <K extends CreateAccountFieldName>(
    key: K,
    value: CreateAccountFormValues[K]
  ) => void;
};

export type CreateAccountFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

export type CreateAccountMediaAsset = {
  alt: string;
  poster?: string;
  src: string;
  type: "image" | "video";
};

export type CreateAccountMediaTileCorners = {
  bottomLeft?: boolean;
  bottomRight?: boolean;
  topLeft?: boolean;
  topRight?: boolean;
};

type CreateAccountMediaTileBase = {
  className: string;
  id: string;
  radiusClassName?: string;
  roundedCorners?: CreateAccountMediaTileCorners;
};

export type CreateAccountMediaTileConfig =
  | (CreateAccountMediaTileBase & {
      kind: "media";
      media: CreateAccountMediaAsset;
      objectPosition?: string;
    })
  | (CreateAccountMediaTileBase & {
      description: string;
      kind: "feature";
      title: string;
      tone: "amber" | "purple" | "black";
    })
  | (CreateAccountMediaTileBase & {
      kind: "brand";
    });
