export type TemplateConfig = { unit: string; quantity: string; unit_rate: string };

export type FurnitureTemplate = {
  id: string;
  name: string;
  description: string;
  default_pricing_method: "manual";
  default_config: TemplateConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TemplatePayload = Pick<FurnitureTemplate, "name" | "description" | "default_pricing_method" | "default_config">;
