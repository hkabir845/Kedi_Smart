from app.models.user import UserRole

# Permission mapping for RBAC
PERMISSIONS = {
    UserRole.SUPER_ADMIN: [
        "*",  # All permissions
    ],
    UserRole.ADMIN: [
        "content.publish",
        "content.edit",
        "content.delete",
        "product.create",
        "product.edit",
        "product.delete",
        "order.manage",
        "listing.moderate",
        "user.manage",
        "verification.approve",
        "settings.manage",
    ],
    UserRole.VET: [
        "vet.profile.manage",
        "vet.availability.manage",
        "vet.appointment.manage",
        "pet.medical.add",
        "pet.vaccination.add",
        "pet.prescription.add",
        "content.create",
        "content.verify",
        "blog.create",
        "blog.edit",
    ],
    UserRole.VENDOR: [
        "product.create",
        "product.edit",
        "product.delete",
        "order.view",
    ],
    UserRole.BREEDER: [
        "listing.create",
        "listing.edit",
        "listing.delete",
        "product.create",
    ],
    UserRole.TRADER: [
        "listing.create",
        "listing.edit",
        "listing.delete",
    ],
    UserRole.SHELTER: [
        "listing.create",
        "listing.edit",
        "listing.delete",
    ],
    UserRole.OWNER: [
        "pet.create",
        "pet.edit",
        "pet.delete",
        "pet.medical.view",
        "appointment.create",
        "order.create",
        "blog.create",
        "blog.edit",
        "blog.delete",
    ],
}


def check_permission(role: UserRole, permission: str) -> bool:
    """Check if a role has a specific permission"""
    role_perms = PERMISSIONS.get(role, [])
    
    # Super admin has all permissions
    if "*" in role_perms:
        return True
    
    # Exact match
    if permission in role_perms:
        return True
    
    # Wildcard match (e.g., "content.*" matches "content.edit")
    for perm in role_perms:
        if perm.endswith(".*"):
            prefix = perm[:-2]
            if permission.startswith(prefix + "."):
                return True
    
    return False
