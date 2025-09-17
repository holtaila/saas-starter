import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { 
  getPhoneNumberById, 
  updatePhoneNumber, 
  deletePhoneNumber 
} from '@/lib/db/queries/phone-numbers';
import { z } from 'zod';

const updatePhoneNumberSchema = z.object({
  phone_number: z.string().optional(),
  display_name: z.string().optional(),
  provider: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  capabilities: z.array(z.string()).optional(),
  retell_phone_number_id: z.string().optional(),
  retell_inbound_agent_id: z.string().optional(),
  retell_outbound_agent_id: z.string().optional(),
  notes: z.string().optional(),
  max_concurrent_calls: z.number().optional(),
  rate_limit_per_minute: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { id } = await context.params;
    const phoneNumber = await getPhoneNumberById(id);

    return NextResponse.json(phoneNumber);
  } catch (error) {
    console.error('Error fetching phone number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone number' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validatedData = updatePhoneNumberSchema.parse(body);

    const phoneNumber = await updatePhoneNumber(id, validatedData);

    return NextResponse.json(phoneNumber);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
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
    await deletePhoneNumber(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}