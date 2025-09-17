import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { setPrimaryPhoneNumber } from '@/lib/db/queries/phone-numbers';
import { z } from 'zod';

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
    const validatedData = setPrimarySchema.parse(body);

    // For now, users can only set primary numbers for their own organization
    if (validatedData.organization_id !== userProfile.profile.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const assignment = await setPrimaryPhoneNumber(id, validatedData.organization_id);

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error setting primary phone number:', error);
    return NextResponse.json(
      { error: 'Failed to set primary phone number' },
      { status: 500 }
    );
  }
}