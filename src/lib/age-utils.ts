/**
 * Calculate age from birthdate
 * @param birthdate - Date string in YYYY-MM-DD format
 * @returns Current age in years
 */
export function calculateAge(birthdate: string): number {
    const today = new Date();
    const birth = new Date(birthdate);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Get age from user profile (calculates from birthdate if available, falls back to age field)
 * @param profile - User profile object
 * @returns Current age or undefined
 */
export function getAge(profile: { birthdate?: string; age?: number }): number | undefined {
    if (profile.birthdate) {
        return calculateAge(profile.birthdate);
    }
    return profile.age;
}
