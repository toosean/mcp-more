import { z, ZodTypeAny, ZodRawShape, ZodIssueCode } from "zod";
import type { JSONSchema7, JSONSchema7Definition } from "json-schema";

/**
 * Converts a JSON Schema 7 definition to a Zod schema type
 */
function convertDefinitionToZod(definition: JSONSchema7Definition): ZodTypeAny {
  // Handle boolean schemas
  if (typeof definition === "boolean") {
    return definition ? z.any() : z.never();
  }

  const schema = definition as JSONSchema7;
  return convertJsonSchemaToZod(schema);
}

/**
 * Add description to a Zod schema if present in JSON Schema
 */
function addDescription(zodSchema: ZodTypeAny, jsonSchema: JSONSchema7): ZodTypeAny {
  if (jsonSchema.description) {
    return zodSchema.describe(jsonSchema.description);
  }
  return zodSchema;
}

/**
 * Main conversion function from JSON Schema 7 to Zod
 */
function convertJsonSchemaToZod(schema: JSONSchema7): ZodTypeAny {
  // Handle empty or undefined schema
  if (!schema || Object.keys(schema).length === 0) {
    return z.any();
  }

  // Handle const values
  if (schema.const !== undefined) {
    // Only handle primitive const values
    if (typeof schema.const === 'string' || typeof schema.const === 'number' ||
        typeof schema.const === 'boolean' || schema.const === null) {
      return addDescription(z.literal(schema.const as any), schema);
    }
    // For complex const values, fall back to any with validation
    return addDescription(z.any().refine(val => JSON.stringify(val) === JSON.stringify(schema.const)), schema);
  }

  // Handle enum values
  if (schema.enum && schema.enum.length > 0) {
    // Filter to only primitive values for z.enum
    const primitiveValues = schema.enum.filter(val =>
      typeof val === 'string' || typeof val === 'number' ||
      typeof val === 'boolean' || val === null
    );

    if (primitiveValues.length === schema.enum.length && primitiveValues.length > 0) {
      // All values are primitive, use z.enum or z.literal
      const [first, ...rest] = primitiveValues;
      let enumSchema: ZodTypeAny;
      if (rest.length === 0) {
        enumSchema = z.literal(first as any);
      } else {
        enumSchema = z.enum([first, ...rest] as [any, ...any[]]);
      }
      return addDescription(enumSchema, schema);
    } else {
      // Has complex values, use refine for validation
      return addDescription(
        z.any().refine(val => schema.enum!.some(enumVal =>
          JSON.stringify(val) === JSON.stringify(enumVal)
        )),
        schema
      );
    }
  }

  // Handle type-based conversion
  if (schema.type) {
    switch (schema.type) {
      case "string":
        return convertStringSchema(schema);
      case "number":
        return convertNumberSchema(schema);
      case "integer":
        return convertIntegerSchema(schema);
      case "boolean":
        return addDescription(z.boolean(), schema);
      case "null":
        return addDescription(z.null(), schema);
      case "array":
        return convertArraySchema(schema);
      case "object":
        return convertObjectSchema(schema);
      default:
        return addDescription(z.any(), schema);
    }
  }

  // Handle union types (anyOf, oneOf)
  if (schema.anyOf && schema.anyOf.length > 0) {
    const zodSchemas = schema.anyOf.map(convertDefinitionToZod);
    if (zodSchemas.length === 1) {
      return addDescription(zodSchemas[0], schema);
    } else if (zodSchemas.length >= 2) {
      const unionSchema = z.union([zodSchemas[0], zodSchemas[1], ...zodSchemas.slice(2)]);
      return addDescription(unionSchema, schema);
    }
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const zodSchemas = schema.oneOf.map(convertDefinitionToZod);
    if (zodSchemas.length === 1) {
      return addDescription(zodSchemas[0], schema);
    } else if (zodSchemas.length >= 2) {
      const unionSchema = z.union([zodSchemas[0], zodSchemas[1], ...zodSchemas.slice(2)]);
      return addDescription(unionSchema, schema);
    }
  }

  // Handle intersection types (allOf)
  if (schema.allOf && schema.allOf.length > 0) {
    const zodSchemas = schema.allOf.map(convertDefinitionToZod);
    const intersectionSchema = zodSchemas.reduce((acc, curr) => acc.and(curr));
    return addDescription(intersectionSchema, schema);
  }

  // Default fallback
  return addDescription(z.any(), schema);
}

/**
 * Convert string schema with validation constraints
 */
function convertStringSchema(schema: JSONSchema7): ZodTypeAny {
  let zodSchema = z.string();

  if (schema.minLength !== undefined) {
    zodSchema = zodSchema.min(schema.minLength);
  }

  if (schema.maxLength !== undefined) {
    zodSchema = zodSchema.max(schema.maxLength);
  }

  if (schema.pattern) {
    zodSchema = zodSchema.regex(new RegExp(schema.pattern));
  }

  return addDescription(zodSchema, schema);
}

/**
 * Convert number schema with validation constraints
 */
function convertNumberSchema(schema: JSONSchema7): ZodTypeAny {
  let zodSchema = z.number();

  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.min(schema.minimum);
  }

  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.max(schema.maximum);
  }

  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf);
  }

  return addDescription(zodSchema, schema);
}

/**
 * Convert integer schema with validation constraints
 */
function convertIntegerSchema(schema: JSONSchema7): ZodTypeAny {
  let zodSchema = z.number().int();

  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.min(schema.minimum);
  }

  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.max(schema.maximum);
  }

  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf);
  }

  return addDescription(zodSchema, schema);
}

/**
 * Convert array schema with item validation
 */
function convertArraySchema(schema: JSONSchema7): ZodTypeAny {
  let itemSchema: ZodTypeAny = z.any();

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      // Tuple-like arrays - for simplicity, treat as regular array with union of all item types
      if (schema.items.length > 0) {
        const itemSchemas = schema.items.map(convertDefinitionToZod);
        if (itemSchemas.length === 1) {
          itemSchema = itemSchemas[0];
        } else if (itemSchemas.length >= 2) {
          // Create union of all item types
          itemSchema = z.union([itemSchemas[0], itemSchemas[1], ...itemSchemas.slice(2)] as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
        }
      }
    } else {
      // Single item type
      itemSchema = convertDefinitionToZod(schema.items);
    }
  }

  let zodSchema = z.array(itemSchema);

  if (schema.minItems !== undefined) {
    zodSchema = zodSchema.min(schema.minItems);
  }

  if (schema.maxItems !== undefined) {
    zodSchema = zodSchema.max(schema.maxItems);
  }

  return addDescription(zodSchema, schema);
}

/**
 * Convert object schema with property validation
 */
function convertObjectSchema(schema: JSONSchema7): ZodTypeAny {
  const properties = schema.properties || {};
  const required = schema.required || [];
  const shape: ZodRawShape = {};

  // Convert properties
  for (const [key, propSchema] of Object.entries(properties)) {
    const zodPropSchema = convertDefinitionToZod(propSchema);

    // Make property optional if not in required array
    if (required.includes(key)) {
      shape[key] = zodPropSchema;
    } else {
      shape[key] = zodPropSchema.optional();
    }
  }

  // Handle additionalProperties
  let objectSchema: ZodTypeAny;
  if (schema.additionalProperties === false) {
    objectSchema = z.object(shape).strict();
  } else {
    objectSchema = z.object(shape);
  }

  return addDescription(objectSchema, schema);
}

/**
 * Main export function that converts JSONSchema7 to ZodRawShape
 * Used specifically for MCP tool registration
 */
export function convertJsonSchema7ToZodRawShape(
  schema: JSONSchema7
): ZodRawShape {
  try {
    // If the schema is an object type, extract its properties as ZodRawShape
    if (schema.type === "object" || schema.properties) {
      const properties = schema.properties || {};
      const required = schema.required || [];
      const shape: ZodRawShape = {};

      // Convert each property to a Zod schema
      for (const [key, propSchema] of Object.entries(properties)) {
        const zodPropSchema = convertDefinitionToZod(propSchema);

        // Make property optional if not in required array
        if (required.includes(key)) {
          shape[key] = zodPropSchema;
        } else {
          shape[key] = zodPropSchema.optional();
        }
      }

      return shape;
    }

    // If schema is not an object, wrap the converted schema in a generic shape
    const convertedSchema = convertJsonSchemaToZod(schema);
    return { value: convertedSchema };
  } catch (error) {
    // Fallback to permissive schema on any error
    console.warn("Failed to convert JSON Schema to Zod:", error);
    return { value: z.any() };
  }
}