import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAcademicYear } from "../../contexts/AcademicYearContext";

interface AcademicYearPickerProps {
  className?: string;
}

const AcademicYearPicker = ({ className }: AcademicYearPickerProps) => {
  const { academicYear, setAcademicYear, availableYears } = useAcademicYear();

  return (
    <Select value={academicYear} onValueChange={setAcademicYear}>
      <SelectTrigger className={className ?? "w-[170px]"}>
        <CalendarRange className="h-4 w-4 mr-2 text-gray-500" />
        <SelectValue placeholder="Academic Year" />
      </SelectTrigger>
      <SelectContent>
        {availableYears.map((year) => (
          <SelectItem key={year} value={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AcademicYearPicker;
