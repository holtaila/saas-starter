import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { 
  assignPhoneNumberToOrganization, 
  unassignPhoneNumberFromOrganization,
  setPrimaryPhoneNumber 
} from '@/lib/db/queries/phone-numbers';
import { z } from 'zod';

const assignPhoneSchema = z.object({
  organization_id: z.string().optional(),
  is_primary: z.boolean().optional().default(false),
});

const setPrimarySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validatedData = assignPhoneSchema.parse(body);

    // Use the current user's organization if not specified
    const organizationId = validatedData.organization_id || userProfile.profile.organization_id;

    // For now, users can only assign numbers to their own organization
    // In the future, this could be extended for admin roles
    if (organizationId !== userProfile.profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const assignment = await assignPhoneNumberToOrganization(
      id,
      organizationId,
      validatedData.is_primary
    );

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error assigning phone number:', error);
    return NextResponse.json(
      { error: 'Failed to assign phone number' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // For now, users can only unassign numbers from their own organization
    if (organizationId !== userProfile.profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await unassignPhoneNumberFromOrganization(id, organizationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unassigning phone number:', error);
    return NextResponse.json(
      { error: 'Failed to unassign phone number' },
      { status: 500 }
    );
  }
}