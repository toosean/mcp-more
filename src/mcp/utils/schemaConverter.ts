import z from "zod";

/**
 * 将 JSON Schema 转换为 Zod Schema
 * @param jsonSchema JSON Schema 对象
 * @returns Zod Schema
 */
export function convertJsonSchemaToZod(jsonSchema: any): any {
    if (!jsonSchema) {
        return z.any();
    }

    // Handle different types
    if (jsonSchema.type === "string") {
        return z.string();
    } else if (jsonSchema.type === "number") {
        return z.number();
    } else if (jsonSchema.type === "boolean") {
        return z.boolean();
    } else if (jsonSchema.type === "array") {
        if (jsonSchema.items) {
            const itemSchema = convertJsonSchemaToZod(jsonSchema.items);
            return z.array(itemSchema);
        } else {
            return z.array(z.any());
        }
    } else if (jsonSchema.type === "object") {
        const zodShape = z.object({});
        const required = jsonSchema.required || [];

        if (jsonSchema.properties) {
            Object.entries(jsonSchema.properties).forEach(([key, prop]: [string, any]) => {
                let zodType = convertJsonSchemaToZod(prop);

                if (prop.description) {
                    zodType = zodType.describe(prop.description);
                }

                // Make field optional if not in required array
                if (!required.includes(key)) {
                    zodType = zodType.optional();
                }

                zodShape.setKey(key, zodType);
            });
        }

        return zodShape;
    } else {
        return z.any();
    }
}