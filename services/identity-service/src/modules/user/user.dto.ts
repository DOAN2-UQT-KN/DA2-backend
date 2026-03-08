// Request DTOs
export interface CreateUserRequest {
    email: string;
    name: string;
    password: string;
    avatar?: string;
    bio?: string;
    roleId: string;
}

export interface UpdateUserRequest {
    name?: string;
    avatar?: string;
    bio?: string;
    roleId?: string;
}

// Response DTOs (excludes password and sensitive fields)
export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    roleId: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
