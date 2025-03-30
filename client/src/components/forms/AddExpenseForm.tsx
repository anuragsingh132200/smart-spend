import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

interface AddExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editExpense?: ExpenseFormValues | null; // Added prop for editing
}

// Extend the expense schema with client validation
const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export function AddExpenseForm({ open, onOpenChange, editExpense }: AddExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState(editExpense?.category || "Food");

  const categories = [
    "Food",
    "Groceries",
    "Rent",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Education",
    "Health",
    "Shopping",
    "Travel",
    "Other",
  ];

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      userId: user?.id,
      category: editExpense?.category || "Food",
      subcategory: editExpense?.subcategory || "",
      amount: editExpense?.amount || undefined,
      date: editExpense?.date || new Date().toISOString().split("T")[0],
      description: editExpense?.description || "",
      isRecurring: editExpense?.isRecurring || false,
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const formattedData = {
        ...values,
        userId: user?.id,
        amount: Number(values.amount),
        date: new Date(values.date).toISOString().split('T')[0],
        subcategory: values.subcategory || ''
      };

      const response = editExpense
        ? await apiRequest("PUT", `/api/expenses/${editExpense.id}`, formattedData)
        : await apiRequest("POST", "/api/expenses", formattedData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create/update expense");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: editExpense ? "Success: Expense Updated" : "Success: Expense Added",
        description: editExpense ? "Expense updated successfully" : "Expense added successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add/update expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    createExpenseMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        type="button"
                        variant={category === selectedCategory ? "default" : "outline"}
                        className="text-xs py-1 h-auto"
                        onClick={() => {
                          setSelectedCategory(category);
                          field.onChange(category);
                        }}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter expense description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">
                    This is a recurring expense
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createExpenseMutation.isPending}>
                {createExpenseMutation.isPending ? "Saving..." : editExpense ? "Update Expense" : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}