import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  CURRENT_ACADEMIC_YEAR,
  SELECTABLE_ACADEMIC_YEARS,
} from "../lib/academicYear";

const STORAGE_KEY = "selectedAcademicYear";

interface AcademicYearContextValue {
  academicYear: string;
  setAcademicYear: (year: string) => void;
  availableYears: string[];
}

const AcademicYearContext = createContext<AcademicYearContextValue | undefined>(
  undefined
);

const getInitialYear = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SELECTABLE_ACADEMIC_YEARS.includes(stored)) {
    return stored;
  }
  return CURRENT_ACADEMIC_YEAR;
};

export const AcademicYearProvider = ({ children }: { children: ReactNode }) => {
  const [academicYear, setAcademicYearState] = useState<string>(getInitialYear);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, academicYear);
  }, [academicYear]);

  const setAcademicYear = (year: string) => {
    if (SELECTABLE_ACADEMIC_YEARS.includes(year)) {
      setAcademicYearState(year);
    }
  };

  return (
    <AcademicYearContext.Provider
      value={{
        academicYear,
        setAcademicYear,
        availableYears: SELECTABLE_ACADEMIC_YEARS,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = (): AcademicYearContextValue => {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error(
      "useAcademicYear must be used within an AcademicYearProvider"
    );
  }
  return ctx;
};
