// Auth Request DTOs
export interface SignupRequest {
    email: string;
    password: string;
    name: string;
    roleId?: string; // Optional, defaults to a 'user' role
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface UpdatePasswordRequest {
    userId: string;
    oldPassword: string;
    newPassword: string;
}

export interface RequestPasswordResetRequest {
    email: string;
}

export interface ResetPasswordRequest {
    resetToken: string;
    newPassword: string;
}

// Auth Response DTOs
export interface SignupResponse {
    id: string;
    email: string;
    name: string;
    roleId: string;
    avatar: string | null;
    bio: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoginResponse {
    user: {
        id: string;
        email: string;
        name: string;
        roleId: string;
        avatar: string | null;
        bio: string | null;
    };
    accessToken: string;
    refreshToken: string;
}

export interface RefreshTokenResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        roleId: string;
    };
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
