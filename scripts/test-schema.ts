import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function test() {
  console.log('Testing if backend schema has liveDate field...');
  const { data: themes } = await client.models.Theme.list();
  const themeId = themes?.[0]?.id;
  if (!themeId) { 
    console.log('No themes found'); 
    return;
  }

  const result = await client.models.Initiative.create({
    name: '__test_schema__',
    themeId,
    liveDate: 'TEST DATE',
    teamStates: JSON.stringify({})
  } as any);

  if (result.errors) {
    console.log('❌ Schema NOT updated yet:', result.errors[0]?.message);
  } else if (result.data) {
    console.log('✅ Schema IS updated! liveDate field accepted.');
    await client.models.Initiative.delete({ id: result.data.id });
  }
}

test();
