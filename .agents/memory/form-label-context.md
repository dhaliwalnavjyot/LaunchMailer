---
name: FormLabel outside FormField
description: shadcn/ui FormLabel throws if rendered outside a FormField context; use plain <label> instead.
---

`shadcn/ui` `FormLabel` internally calls `useFormField()` which reads a React context set by `<FormField>`. If used outside `<FormField>`, it throws: "useFormField should be used within <FormField>".

**Rule:** Only use `<FormLabel>` inside `<FormField render={...}>` / `<FormItem>` trees. For standalone labels (e.g. in sheets, panels, or AI assistant UIs), use a plain `<label className="text-sm font-medium leading-none">`.

**Why:** The hook is not optional — it always throws, not just warns.

**How to apply:** Check any sheet/dialog/custom panel that uses FormLabel without a wrapping FormField. Replace with native label element.
