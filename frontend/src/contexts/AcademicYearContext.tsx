import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import {
  CURRENT_ACADEMIC_YEAR,
  SELECTABLE_ACADEMIC_YEARS,
} from "../lib/academicYear";

interface AcademicYearContextValue {
  academicYear: string;
  setAcademicYear: (year: string) => void;
  availableYears: string[];
}

const AcademicYearContext = createContext<AcademicYearContextValue | undefined>(
  undefined
);

export const AcademicYearProvider = ({ children }: { children: ReactNode }) => {
  // Deliberately not persisted. It used to live in localStorage, which
  // outlived logout: a student who once looked at a past year stayed pinned
  // to it and saw that year's approved receipt instead of being asked to
  // upload for the current one -- and on a shared machine the stale year
  // carried over to the next student to log in.
  const [academicYear, setAcademicYearState] =
    useState<string>(CURRENT_ACADEMIC_YEAR);

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
