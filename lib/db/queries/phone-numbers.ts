import { getServerSupabase } from '@/lib/supabase/utils';
import type { Database } from '@/lib/types/database';

type PhoneNumber = Database['public']['Tables']['phone_numbers']['Row'];
type PhoneNumberInsert = Database['public']['Tables']['phone_numbers']['Insert'];
type PhoneNumberUpdate = Database['public']['Tables']['phone_numbers']['Update'];
type OrganizationPhoneAssignment = Database['public']['Tables']['organization_phone_assignments']['Row'];

export async function getPhoneNumbers(organizationId?: string) {
  const supabase = await getServerSupabase();
  
  let query = supabase
    .from('phone_numbers')
    .select(`
      *,
      organization_phone_assignments (
        id,
        organization_id,
        is_primary,
        assigned_at,
        organization:organizations (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_phone_assignments.organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching phone numbers:', error);
    throw new Error('Failed to fetch phone numbers');
  }

  return data;
}

export async function getPhoneNumberById(id: string) {
  const supabase = await getServerSupabase();
  
  const { data, error } = await supabase
    .from('phone_numbers')
    .select(`
      *,
      organization_phone_assignments (
        id,
        organization_id,
        is_primary,
        assigned_at,
        organization:organizations (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching phone number:', error);
    throw new Error('Failed to fetch phone number');
  }

  return data;
}

export async function createPhoneNumber(data: PhoneNumberInsert) {
  const supabase = await getServerSupabase();
  
  const { data: phoneNumber, error } = await supabase
    .from('phone_numbers')
    .insert({
      ...data,
      created_at: Date.now().toString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating phone number:', error);
    throw new Error('Failed to create phone number');
  }

  return phoneNumber;
}

export async function updatePhoneNumber(id: string, data: PhoneNumberUpdate) {
  const supabase = await getServerSupabase();
  
  const { data: phoneNumber, error } = await supabase
    .from('phone_numbers')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating phone number:', error);
    throw new Error('Failed to update phone number');
  }

  return phoneNumber;
}

export async function deletePhoneNumber(id: string) {
  const supabase = await getServerSupabase();
  
  // First, delete any organization assignments
  await supabase
    .from('organization_phone_assignments')
    .delete()
    .eq('phone_number_id', id);
  
  const { error } = await supabase
    .from('phone_numbers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting phone number:', error);
    throw new Error('Failed to delete phone number');
  }

  return true;
}

export async function assignPhoneNumberToOrganization(
  phoneNumberId: string, 
  organizationId: string, 
  isPrimary = false
) {
  const supabase = await getServerSupabase();
  
  // If setting as primary, first unset any existing primary number for this org
  if (isPrimary) {
    await supabase
      .from('organization_phone_assignments')
      .update({ is_primary: false })
      .eq('organization_id', organizationId)
      .eq('is_primary', true);
  }
  
  const { data, error } = await supabase
    .from('organization_phone_assignments')
    .insert({
      phone_number_id: phoneNumberId,
      organization_id: organizationId,
      is_primary: isPrimary,
      assigned_at: Date.now()
    })
    .select()
    .single();

  if (error) {
    console.error('Error assigning phone number:', error);
    throw new Error('Failed to assign phone number');
  }

  return data;
}

export async function unassignPhoneNumberFromOrganization(
  phoneNumberId: string, 
  organizationId: string
) {
  const supabase = await getServerSupabase();
  
  const { error } = await supabase
    .from('organization_phone_assignments')
    .delete()
    .eq('phone_number_id', phoneNumberId)
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error unassigning phone number:', error);
    throw new Error('Failed to unassign phone number');
  }

  return true;
}

export async function setPrimaryPhoneNumber(
  phoneNumberId: string, 
  organizationId: string
) {
  const supabase = await getServerSupabase();
  
  // Start a transaction to ensure atomicity
  const { error: unsetError } = await supabase
    .from('organization_phone_assignments')
    .update({ is_primary: false })
    .eq('organization_id', organizationId)
    .eq('is_primary', true);

  if (unsetError) {
    console.error('Error unsetting primary phone:', unsetError);
    throw new Error('Failed to update primary phone number');
  }

  const { data, error } = await supabase
    .from('organization_phone_assignments')
    .update({ is_primary: true })
    .eq('phone_number_id', phoneNumberId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('Error setting primary phone:', error);
    throw new Error('Failed to set primary phone number');
  }

  return data;
}

export async function getOrganizationPhoneNumbers(organizationId: string) {
  const supabase = await getServerSupabase();
  
  const { data, error } = await supabase
    .from('organization_phone_assignments')
    .select(`
      *,
      phone_number:phone_numbers (
        id,
        phone_number,
        provider,
        status,
        capabilities,
        created_at,
        updated_at,
        retell_phone_number_id
      )
    `)
    .eq('organization_id', organizationId)
    .order('is_primary', { ascending: false })
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching organization phone numbers:', error);
    throw new Error('Failed to fetch organization phone numbers');
  }

  return data;
}

export async function getPrimaryPhoneNumber(organizationId: string) {
  const supabase = await getServerSupabase();
  
  const { data, error } = await supabase
    .from('organization_phone_assignments')
    .select(`
      *,
      phone_number:phone_numbers (
        id,
        phone_number,
        provider,
        status,
        capabilities,
        created_at,
        updated_at
      )
    `)
    .eq('organization_id', organizationId)
    .eq('is_primary', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching primary phone number:', error);
    throw new Error('Failed to fetch primary phone number');
  }

  return data;
}