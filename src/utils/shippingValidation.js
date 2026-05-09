export const checkoutCountries = {
  IN: {
    code: "IN",
    label: "India",
    currency: "INR",
    phoneDigits: 10,
    postalLength: 6,
    phonePlaceholder: "10 digit mobile number",
    postalPlaceholder: "6 digit PIN code",
    states: {
      // States
      AP: { label: "Andhra Pradesh" },
      AR: { label: "Arunachal Pradesh" },
      AS: { label: "Assam" },
      BR: { label: "Bihar" },
      CG: { label: "Chhattisgarh" },
      GA: { label: "Goa" },
      GJ: { label: "Gujarat" },
      HR: { label: "Haryana" },
      HP: { label: "Himachal Pradesh" },
      JH: { label: "Jharkhand" },
      KA: { label: "Karnataka" },
      KL: { label: "Kerala" },
      MP: { label: "Madhya Pradesh" },
      MH: { label: "Maharashtra" },
      MN: { label: "Manipur" },
      ML: { label: "Meghalaya" },
      MZ: { label: "Mizoram" },
      NL: { label: "Nagaland" },
      OD: { label: "Odisha" },
      PB: { label: "Punjab" },
      RJ: { label: "Rajasthan" },
      SK: { label: "Sikkim" },
      TN: { label: "Tamil Nadu" },
      TS: { label: "Telangana" },
      TR: { label: "Tripura" },
      UP: { label: "Uttar Pradesh" },
      UK: { label: "Uttarakhand" },
      WB: { label: "West Bengal" },

      // Union Territories
      AN: { label: "Andaman and Nicobar Islands" },
      CH: { label: "Chandigarh" },
      DH: { label: "Dadra and Nagar Haveli and Daman and Diu" },
      DL: { label: "Delhi" },
      JK: { label: "Jammu and Kashmir" },
      LA: { label: "Ladakh" },
      LD: { label: "Lakshadweep" },
      PY: { label: "Puducherry" },
    },
  },

  US: {
    code: "US",
    label: "United States",
    currency: "USD",
    phoneDigits: 10,
    postalLength: 5,
    phonePlaceholder: "10 digit phone number",
    postalPlaceholder: "5 digit ZIP code",
    states: {
      AL: { label: "Alabama" },
      AK: { label: "Alaska" },
      AZ: { label: "Arizona" },
      AR: { label: "Arkansas" },
      CA: { label: "California" },
      CO: { label: "Colorado" },
      CT: { label: "Connecticut" },
      DE: { label: "Delaware" },
      DC: { label: "District of Columbia" },
      FL: { label: "Florida" },
      GA: { label: "Georgia" },
      HI: { label: "Hawaii" },
      ID: { label: "Idaho" },
      IL: { label: "Illinois" },
      IN: { label: "Indiana" },
      IA: { label: "Iowa" },
      KS: { label: "Kansas" },
      KY: { label: "Kentucky" },
      LA: { label: "Louisiana" },
      ME: { label: "Maine" },
      MD: { label: "Maryland" },
      MA: { label: "Massachusetts" },
      MI: { label: "Michigan" },
      MN: { label: "Minnesota" },
      MS: { label: "Mississippi" },
      MO: { label: "Missouri" },
      MT: { label: "Montana" },
      NE: { label: "Nebraska" },
      NV: { label: "Nevada" },
      NH: { label: "New Hampshire" },
      NJ: { label: "New Jersey" },
      NM: { label: "New Mexico" },
      NY: { label: "New York" },
      NC: { label: "North Carolina" },
      ND: { label: "North Dakota" },
      OH: { label: "Ohio" },
      OK: { label: "Oklahoma" },
      OR: { label: "Oregon" },
      PA: { label: "Pennsylvania" },
      RI: { label: "Rhode Island" },
      SC: { label: "South Carolina" },
      SD: { label: "South Dakota" },
      TN: { label: "Tennessee" },
      TX: { label: "Texas" },
      UT: { label: "Utah" },
      VT: { label: "Vermont" },
      VA: { label: "Virginia" },
      WA: { label: "Washington" },
      WV: { label: "West Virginia" },
      WI: { label: "Wisconsin" },
      WY: { label: "Wyoming" },
    },
  },

  AU: {
    code: "AU",
    label: "Australia",
    currency: "AUD",
    phoneDigits: 9,
    postalLength: 4,
    phonePlaceholder: "9 digit mobile number",
    postalPlaceholder: "4 digit postcode",
    states: {
      NSW: { label: "New South Wales" },
      QLD: { label: "Queensland" },
      SA: { label: "South Australia" },
      TAS: { label: "Tasmania" },
      VIC: { label: "Victoria" },
      WA: { label: "Western Australia" },

      // Major Territories
      ACT: { label: "Australian Capital Territory" },
      NT: { label: "Northern Territory" },
    },
  },

  // Temporarily disabled until GPSR/EU compliance is ready
  // DE: { ... },
  // FR: { ... },
};

export const allowedCountries = Object.values(checkoutCountries).map((country) => ({
  code: country.code,
  label: country.label,
  phoneDigits: country.phoneDigits,
  postalLength: country.postalLength,
}));

export function getCountryConfig(countryCode) {
  return checkoutCountries[countryCode] || checkoutCountries.IN;
}

export function getStatesForCountry(countryCode) {
  const country = getCountryConfig(countryCode);

  return Object.entries(country.states).map(([code, state]) => ({
    code,
    label: state.label,
  }));
}

export function getCitiesForState(countryCode, stateCode) {
  const country = getCountryConfig(countryCode);
  const state = country.states[stateCode];

  return state?.cities || [];
}

export function validateShippingForm(form) {
  const errors = {};
  const country = getCountryConfig(form.country);

  const firstName = String(form.firstName || "").trim();
  const lastName = String(form.lastName || "").trim();
  const email = String(form.email || "").trim();
  const phone = String(form.phone || "").trim();
  const addressLine1 = String(form.addressLine1 || "").trim();
  const state = String(form.state || "").trim();
  const city = String(form.city || "").trim();
  const postalCode = String(form.postalCode || "").trim();

  if (firstName.length < 2) {
    errors.firstName = "First name must be at least 2 characters.";
  }

  if (lastName.length < 2) {
    errors.lastName = "Last name must be at least 2 characters.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!new RegExp(`^\\d{${country.phoneDigits}}$`).test(phone)) {
    errors.phone = `${country.label} phone number must be exactly ${country.phoneDigits} digits.`;
  }

  if (!addressLine1 || addressLine1.length < 8) {
    errors["Address line 1"] = "Enter a complete street address.";
  }

  const validStates = getStatesForCountry(form.country).map((item) => item.code);

  if (!state || !validStates.includes(state)) {
    errors.State = "Please select a valid state/region.";
  }

  if (!city || city.length < 2) {
    errors.City = "Enter a valid city or town.";
  } else if (!/^[a-zA-Z\s.'-]{2,60}$/.test(city)) {
    errors.City = "City can contain only letters, spaces, apostrophes, dots, and hyphens.";
  }

  if (!new RegExp(`^\\d{${country.postalLength}}$`).test(postalCode)) {
    errors["Postal code"] = `${country.label} postal code must be exactly ${country.postalLength} digits.`;
  }

  return errors;
}