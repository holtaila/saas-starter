import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth/supabase-auth';
import { getPhoneNumbers, createPhoneNumber, getOrganizationPhoneNumbers } from '@/lib/db/queries/phone-numbers';
import { z } from 'zod';

const createPhoneNumberSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  display_name: z.string().optional(),
  provider: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('pending'),
  capabilities: z.array(z.string()).optional(),
  retell_phone_number_id: z.string().optional(),
  retell_inbound_agent_id: z.string().optional(),
  retell_outbound_agent_id: z.string().optional(),
  notes: z.string().optional(),
  max_concurrent_calls: z.number().optional(),
  rate_limit_per_minute: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const organizationScope = searchParams.get('organization_scope');

    let phoneNumbers;
    if (organizationScope === 'true') {
      // Return only phone numbers assigned to user's organization
      const assignments = await getOrganizationPhoneNumbers(userProfile.profile.organization_id);
      // Flatten the structure - extract phone numbers from assignments
      phoneNumbers = assignments?.map(assignment => ({
        ...assignment.phone_number,
        is_primary: assignment.is_primary,
        assignment_id: assignment.id
      })).filter(phone => phone.id) || []; // Filter out any null phone numbers
    } else {
      // Return all phone numbers (admin view)
      phoneNumbers = await getPhoneNumbers();
    }

    return NextResponse.json(phoneNumbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile?.profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createPhoneNumberSchema.parse(body);

    // Create the phone number
    const phoneNumber = await createPhoneNumber(validatedData);

    return NextResponse.json(phoneNumber, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to create phone number' },
      { status: 500 }
    );
  }
}