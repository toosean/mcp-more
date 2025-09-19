import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export interface FormFieldConfig {
  type: 'string' | 'password' | 'select';
  id: string;
  title?: string;
  description: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
}

interface DynamicFormProps {
  config: FormFieldConfig[];
  onSubmit: (data: Record<string, any>) => void;
  submitButtonText?: string;
}

export default function DynamicForm({ config, onSubmit, submitButtonText = 'Submit' }: DynamicFormProps) {
  const form = useForm<Record<string, any>>({
    defaultValues: config.reduce((acc, field) => {
      acc[field.id] = '';
      return acc;
    }, {} as Record<string, any>),
    mode: 'onBlur', // Validate on blur for better UX
  });

  const handleSubmit = (data: Record<string, any>) => {
    onSubmit(data);
  };

  const renderField = (fieldConfig: FormFieldConfig) => {
    const { type, id, title, description, options } = fieldConfig;
    const displayLabel = title || description;

    return (
      <FormField
        key={id}
        control={form.control}
        name={id}
        rules={{
          required: {
            value: true,
            message: `${displayLabel} is required`
          },
          validate: (value) => {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return `${displayLabel} cannot be empty`;
            }
            return true;
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              {displayLabel}
            </FormLabel>
            <FormControl>
              {type === 'password' ? (
                <Input
                  type="password"
                  placeholder={`Enter ${displayLabel.toLowerCase()}`}
                  {...field}
                />
              ) : type === 'string' ? (
                <Input
                  type="text"
                  placeholder={`Enter ${displayLabel.toLowerCase()}`}
                  {...field}
                />
              ) : type === 'select' && options ? (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${displayLabel.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </FormControl>
            <FormDescription>
              <FormMessage />
              {title ? description : `${description}.`}
            </FormDescription>
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {config.map(renderField)}
        <Button type="submit" className="w-full">
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}