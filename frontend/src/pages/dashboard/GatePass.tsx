import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { studentService, authService } from "../../services/api";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { gatePassSchema, GatePassFormData } from "../../lib/validation";
import { DoorOpen, Calendar } from "lucide-react";

const GatePass = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = authService.getCurrentUser();
  
  const form = useForm<GatePassFormData>({
    resolver: zodResolver(gatePassSchema),
    defaultValues: {
      reason: "",
      date: ""
    }
  });
  
  const onSubmit = async (data: GatePassFormData) => {
    setIsSubmitting(true);
    try {
      await studentService.submitGatePassRequest(data.reason, data.date);
      toast("Gate pass request submitted successfully!");
      form.reset();
    } catch (error: any) {
      toast(error.message || "Failed to submit gate pass request");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gate Pass Request</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DoorOpen className="mr-2 h-5 w-5" />
            Submit Gate Pass Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Gate Pass</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide a detailed reason for your gate pass request"
                        className="min-h-32" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                      <span className="text-edu-primary font-medium text-sm">ID</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Student ID</p>
                      <p className="font-medium">{currentUser?.rollNo}</p>
                    </div>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" /> Date Needed
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Gate Pass Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GatePass;
