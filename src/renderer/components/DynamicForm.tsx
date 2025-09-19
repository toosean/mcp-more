import React, { useImperativeHandle, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/hooks/use-i18n';

export interface FormFieldConfig {
  type: 'string' | 'password' | 'select';
  id: string;
  title?: string;
  description: string;
  defaultValue?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
}

interface DynamicFormProps {
  config: FormFieldConfig[];
  onSubmit: (data: Record<string, any>) => void;
}

export interface DynamicFormRef {
  submit: () => void;
  isValid: () => boolean;
}

// Component to render Markdown descriptions
const MarkdownDescription = ({ content }: { content: string }) => {
  return (
    <div className="mt-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize components for better integration with our design system
          p: ({ children }) => <p className="text-sm text-muted-foreground m-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground border">{children}</code>
          ),
          a: ({ href, children }) => (
            <a
              href="#"
              className="text-primary hover:underline cursor-pointer text-sm"
              onClick={(e) => {
                e.preventDefault();
                if (href && window.shellAPI) {
                  window.shellAPI.openExternal(href);
                }
              }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside text-sm space-y-0.5 mt-1 ml-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-sm space-y-0.5 mt-1 ml-2">{children}</ol>,
          li: ({ children }) => <li className="text-muted-foreground text-sm">{children}</li>,
          h1: ({ children }) => <h1 className="text-base font-semibold text-foreground mt-2 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mt-1 mb-1">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted pl-3 italic text-muted-foreground text-sm mt-1">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const DynamicForm = forwardRef<DynamicFormRef, DynamicFormProps>(({ config, onSubmit }, ref) => {
  const { t } = useI18n();
  const form = useForm<Record<string, any>>({
    defaultValues: config.reduce((acc, field) => {
      acc[field.id] = field.defaultValue || '';
      return acc;
    }, {} as Record<string, any>),
    mode: 'onBlur', // Validate on blur for better UX
  });

  const handleSubmit = (data: Record<string, any>) => {
    onSubmit(data);
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.handleSubmit(handleSubmit)();
    },
    isValid: () => {
      return form.formState.isValid;
    }
  }));

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
            message: t('dynamicForm.validation.required', { label: displayLabel }) || `${displayLabel} is required`
          },
          validate: (value) => {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              return t('dynamicForm.validation.cannotBeEmpty', { label: displayLabel }) || `${displayLabel} cannot be empty`;
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
                <Select onValueChange={field.onChange} value={field.value}>
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
              {title ? (
                <MarkdownDescription content={description} />
              ) : (
                <MarkdownDescription content={`${description}.`} />
              )}
            </FormDescription>
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        {config.map(renderField)}
      </div>
    </Form>
  );
});

DynamicForm.displayName = 'DynamicForm';

export default DynamicForm;