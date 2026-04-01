export type DriverAccountType = 'independent' | 'company';
export type DriverVehicleType = 'compacte' | 'berline' | 'suv';
export type DriverWashType = 'exterior' | 'interior' | 'full';
export type DriverDocumentId =
  | 'id'
  | 'profile'
  | 'license'
  | 'address'
  | 'certificate'
  | 'trade_register'
  | 'manager_id'
  | 'manager_photo';

export type DriverPricing = Record<DriverVehicleType, Record<DriverWashType, number | null>>;

export interface DriverDocumentItem {
  id: DriverDocumentId;
  title: string;
  hint?: string;
}

export const driverVehicleLabels: Record<DriverVehicleType, string> = {
  compacte: 'Compacte',
  berline: 'Berline',
  suv: 'SUV',
};

export const driverWashLabels: Record<DriverWashType, string> = {
  exterior: 'Exterieur',
  interior: 'Interieur',
  full: 'Complet',
};

export const createEmptyDriverPricing = (): DriverPricing => ({
  compacte: { exterior: null, interior: null, full: null },
  berline: { exterior: null, interior: null, full: null },
  suv: { exterior: null, interior: null, full: null },
});

export const createEmptyDriverDocuments = (): Record<DriverDocumentId, string | null> => ({
  id: null,
  profile: null,
  license: null,
  address: null,
  certificate: null,
  trade_register: null,
  manager_id: null,
  manager_photo: null,
});

export const getDriverDocumentItems = (accountType: DriverAccountType): DriverDocumentItem[] =>
  accountType === 'company'
    ? [
        { id: 'profile', title: 'Photo de profil de l entreprise', hint: 'Logo, facade ou visuel principal de l entreprise' },
        { id: 'trade_register', title: 'Registre du commerce', hint: 'Document officiel de l entreprise' },
        { id: 'manager_id', title: 'Piece d identite du gerant', hint: 'Carte nationale, passeport ou titre equivalent' },
        { id: 'manager_photo', title: 'Photo du gerant', hint: 'Portrait recent et clairement visible du gerant' },
      ]
    : [
        { id: 'id', title: "Carte d identite nationale ou passeport" },
        { id: 'profile', title: 'Photo de profil', hint: 'Selfie du laveur independant' },
        { id: 'license', title: 'Permis de conduire' },
        { id: 'address', title: 'Justificatif de domicile ou de residence' },
        { id: 'certificate', title: 'Certificat de bonne conduite' },
      ];

export const normalizeDriverPricing = (value?: Partial<DriverPricing> | null): DriverPricing => {
  const base = createEmptyDriverPricing();
  if (!value) return base;

  (Object.keys(base) as DriverVehicleType[]).forEach((vehicle) => {
    (Object.keys(base[vehicle]) as DriverWashType[]).forEach((service) => {
      const candidate = value?.[vehicle]?.[service];
      base[vehicle][service] = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
    });
  });

  return base;
};

export const isDriverPricingComplete = (pricing: DriverPricing) =>
  (Object.keys(pricing) as DriverVehicleType[]).every((vehicle) =>
    (Object.keys(pricing[vehicle]) as DriverWashType[]).every((service) => {
      const value = pricing[vehicle][service];
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    })
  );
