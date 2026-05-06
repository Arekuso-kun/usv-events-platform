import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { apiRequest, getErrorMessage } from "../api/client";
import type { Lookup, Sponsor } from "../types";

interface UseReferenceDataOptions {
  token: string;
  setError: Dispatch<SetStateAction<string>>;
}

export function useReferenceData(options: UseReferenceDataOptions) {
  const { token, setError } = options;
  const [faculties, setFaculties] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [venues, setVenues] = useState<Lookup[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const request = useCallback(
    <T,>(method: "get" | "post" | "patch" | "delete", url: string, data?: unknown) =>
      apiRequest<T>(method, url, token, data),
    [token],
  );

  const loadLookups = useCallback(async () => {
    try {
      const [facultiesData, departmentsData, venuesData, categoriesData] =
        await Promise.all([
          request<Lookup[]>("get", "/faculties"),
          request<Lookup[]>("get", "/departments"),
          request<Lookup[]>("get", "/venues"),
          request<Lookup[]>("get", "/categories"),
        ]);
      setFaculties(facultiesData);
      setDepartments(departmentsData);
      setVenues(venuesData);
      setCategories(categoriesData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [request, setError]);

  const loadSponsors = useCallback(async () => {
    try {
      setSponsors(await request<Sponsor[]>("get", "/sponsors"));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [request, setError]);

  function addVenue(venue: Lookup) {
    setVenues((current) =>
      [...current, venue].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  return {
    faculties,
    departments,
    venues,
    categories,
    sponsors,
    loadLookups,
    loadSponsors,
    addVenue,
  };
}
