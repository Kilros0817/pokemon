# User Profile Sync Implementation

## Overview
Synchronized authenticated user data with trainer profile data. Now when users sign in, they see their own profile instead of a default one.

## Changes Made

### 1. **Auth Service** (`auth.service.ts`)
- Updated `signUp$()` to automatically create a trainer profile when a new user registers
- Trainer profile is created with:
  - Same ID as the user
  - Name from first name + last name
  - Default values: 0 badges, Kanto region, Trainer rank

```typescript
// After creating user, create trainer profile
const newTrainer = {
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  badge_count: 0,
  region: 'Kanto',
  avatar_url: '',
  rank: 'Trainer'
};
```

### 2. **App Component** (`app.component.ts`)
- Added `AuthService` injection
- Updated `ngOnInit()` to load trainer based on authenticated user
- Uses `currentUser.userId` to load the correct trainer profile

```typescript
ngOnInit(): void {
  if (!this.isAuthRoute()) {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      // Load trainer based on authenticated user's ID
      this.trainerStore.setCurrentTrainer(currentUser.userId);
    }
  }
}
```

### 3. **Database Structure** (`db.json`)
- Users and trainers now use matching IDs
- Each user has a corresponding trainer profile
- Existing users (admin, ash) already have trainer profiles

```json
{
  "users": [
    { "id": "1", "email": "admin@pokemon.com", ... },
    { "id": "2", "email": "ash@pokemon.com", ... }
  ],
  "trainers": [
    { "id": "1", "name": "Admin User", ... },
    { "id": "2", "name": "Ash Ketchum", ... }
  ]
}
```

## User Flow

### **Sign Up Flow**
1. User fills out signup form (email, password, first name, last name)
2. AuthService creates user account in `users` table
3. AuthService automatically creates trainer profile in `trainers` table
4. User ID is stored in localStorage
5. User is logged in and redirected to pokedex
6. App loads trainer profile matching user ID

### **Sign In Flow**
1. User enters email and password
2. AuthService validates credentials
3. User ID is stored in localStorage
4. User is redirected to pokedex
5. App loads trainer profile matching user ID
6. Profile page shows user's own data

### **Profile Page**
- Shows current user's trainer information
- Name, region, badges, rank are all specific to logged-in user
- Avatar uploads are saved to user's own profile
- Changes are persisted to their trainer profile

## Data Mapping

| User Table          | Trainer Table       |
|---------------------|---------------------|
| id                  | id (same)           |
| firstName + lastName| name                |
| -                   | badge_count         |
| -                   | region              |
| -                   | avatar_url          |
| -                   | rank                |

## Benefits

✅ **Personalized Experience**
- Each user sees their own profile
- Changes are saved per user
- No more shared default profile

✅ **Automatic Setup**
- Trainer profile created on signup
- No manual configuration needed
- Seamless user experience

✅ **Data Consistency**
- User ID matches trainer ID
- Easy to link user auth with profile data
- Clean database structure

✅ **Multi-User Support**
- Multiple users can use the app
- Each has their own trainer profile
- Data is isolated per user

## Testing Checklist

- [ ] Sign up creates both user and trainer profile
- [ ] Sign in loads correct trainer profile
- [ ] Profile page shows logged-in user's data
- [ ] Avatar uploads save to correct user
- [ ] Profile edits persist per user
- [ ] Logout clears session correctly
- [ ] Different users see different profiles

## Future Enhancements

- Sync user.firstName/lastName with trainer.name on user profile updates
- Add option to customize trainer name separate from real name
- Add user preferences (theme, language, etc.)
- Link teams and battles to specific users
- Add social features (friend lists, trades, etc.)
