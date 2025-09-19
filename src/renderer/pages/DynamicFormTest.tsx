import React, { useState } from 'react';
import DynamicForm, { FormFieldConfig } from '@/components/DynamicForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

export default function DynamicFormTest() {
  const defaultConfig: FormFieldConfig[] = [
    {
      "type": "password",
      "title": "Password for token",
      "id": "token",
      "description": "GitHub Personal Access Token"
    },
    {
      "type": "string",
      "title": "Email Address",
      "id": "email",
      "description": "Your email address for notifications"
    },
    {
      "type": "select",
      "id": "language",
      "description": "Language",
      "options": [
        {
          "label": "English",
          "value": "en"
        },
        {
          "label": "Chinese",
          "value": "zh"
        }
      ]
    }
  ];

  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(defaultConfig);
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(defaultConfig, null, 2));
  const [jsonError, setJsonError] = useState<string>('');
  const [isResultDialogOpen, setIsResultDialogOpen] = useState<boolean>(false);
  const [formResult, setFormResult] = useState<Record<string, any>>({});

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setJsonError('');
  };

  const handleApplyConfig = () => {
    try {
      const parsed = JSON.parse(jsonText);

      // Validate the structure
      if (!Array.isArray(parsed)) {
        throw new Error('Configuration must be an array');
      }

      for (const field of parsed) {
        if (!field.type || !field.id || !field.description) {
          throw new Error('Each field must have type, id, and description');
        }

        if (!['string', 'password', 'select'].includes(field.type)) {
          throw new Error('Field type must be string, password, or select');
        }

        if (field.type === 'select' && (!field.options || !Array.isArray(field.options))) {
          throw new Error('Select fields must have an options array');
        }
      }

      setFormConfig(parsed);
      setJsonError('');
      toast({
        title: "Configuration updated!",
        description: "Form has been regenerated with the new configuration.",
        variant: "default",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      setJsonError(errorMessage);
      toast({
        title: "Configuration error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleResetConfig = () => {
    setFormConfig(defaultConfig);
    setJsonText(JSON.stringify(defaultConfig, null, 2));
    setJsonError('');
    toast({
      title: "Configuration reset",
      description: "Form configuration has been reset to default.",
      variant: "default",
    });
  };

  const handleFormSubmit = (data: Record<string, any>) => {
    console.log('Form submitted with data:', data);

    // Store the result and show dialog
    setFormResult(data);
    setIsResultDialogOpen(true);

    // Show success toast
    toast({
      title: "Form submitted successfully!",
      description: `Configuration saved with ${Object.keys(data).length} fields.`,
      variant: "default",
    });

    // You can also send it to an API
    console.log('Generated JSON:', JSON.stringify(data, null, 2));
  };

  return (
    <div className="flex-1 p-6 space-y-6 min-h-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dynamic Form Test</h1>
        <p className="text-muted-foreground">
          Test the dynamic form component with JSON configuration
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration Form</CardTitle>
            <CardDescription>
              This form is generated dynamically from the JSON configuration below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicForm
              config={formConfig}
              onSubmit={handleFormSubmit}
              submitButtonText="Save Configuration"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JSON Configuration</CardTitle>
            <CardDescription>
              Edit the JSON configuration below and click "Apply" to regenerate the form:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="Enter JSON configuration..."
              className="min-h-[300px] font-mono text-sm"
            />
            {jsonError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {jsonError}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleApplyConfig} variant="default">
                Apply Configuration
              </Button>
              <Button onClick={handleResetConfig} variant="outline">
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Form Submission Result</DialogTitle>
            <DialogDescription>
              Here's the final JSON data generated from the form:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
              {JSON.stringify(formResult, null, 2)}
            </pre>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsResultDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}