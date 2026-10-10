import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validSlug, uuid, email, phone, money, dateTime, safeNext, pageNumber, parseCsv } from '../src/utils/crm/validation.ts';

test('redirects remain same-origin and reject protocol-relative or backslash URLs', () => {
  for (const value of ['https://evil.test','//evil.test','/\\evil.test','/\nevil.test',null]) assert.equal(safeNext(value),'/');
  assert.equal(safeNext('/grahsiddhi/dashboard'),'/grahsiddhi/dashboard');
});
test('workspace and record identifiers reject reserved routes and invalid IDs', () => {
  assert.ok(validSlug('builder-2'));
  for (const value of ['admin','auth','api','rtl','login','workspaces','../other','UPPER','']) assert.equal(validSlug(value),false);
  assert.throws(()=>uuid('not-a-uuid'));
  assert.equal(uuid('11111111-1111-4111-8111-111111111111'),'11111111-1111-4111-8111-111111111111');
});
test('contact normalization and monetary limits reject invalid input', () => {
  assert.equal(phone('+91 98765-43210'),'919876543210');
  assert.equal(phone(''),null);
  assert.throws(()=>phone('not-a-phone')); assert.throws(()=>phone('123'));
  assert.equal(email('User@Example.com'),'user@example.com'); assert.throws(()=>email('broken',true));
  assert.equal(money('123.45'),123.45);
  for (const value of ['-1','NaN','Infinity','1e12','1.234','1234567890123']) assert.throws(()=>money(value));
});
test('CSV imports support BOM, quotes, commas and multiline fields', () => {
  const rows=parseCsv('\uFEFFfull_name,email,property_interest\r\n"Patel, A",a@example.com,"Tower ""A""\nFloor 2"\r\n');
  assert.deepEqual(rows,[{full_name:'Patel, A',email:'a@example.com',property_interest:'Tower "A"\nFloor 2'}]);
});
test('CSV imports reject malformed, oversized and unexpected schemas', () => {
  for (const value of ['email\na@example.com','full_name,full_name\nA,B','full_name,role\nA,admin','full_name\n"A','full_name\n"A"B','full_name,email\nA','full_name\n']) assert.throws(()=>parseCsv(value));
  assert.throws(()=>parseCsv('full_name\n'+Array(501).fill('A').join('\n')));
});

test('downloadable lead example matches importer headers and field validation', () => {
  const csv = readFileSync(new URL('../public/templates/leads-example.csv', import.meta.url), 'utf8');
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), ['full_name', 'phone', 'email', 'property_interest', 'city']);
  for (const row of rows) {
    assert.ok(row.full_name.trim() && row.full_name.length <= 160);
    phone(row.phone);
    email(row.email);
    assert.ok(row.phone.length <= 40 && row.email.length <= 254 && row.property_interest.length <= 160 && row.city.length <= 100);
  }
  assert.equal(rows[1].property_interest, 'Plot, residential');
});
test('pagination and date inputs are bounded', () => {
  assert.equal(pageNumber('0'),1);assert.equal(pageNumber('-1'),1);assert.equal(pageNumber('10'),10);assert.equal(pageNumber('Infinity'),1);
  assert.equal(dateTime('2026-10-08T12:30:00+05:30'),'2026-10-08T07:00:00.000Z');assert.throws(()=>dateTime('invalid'));assert.equal(dateTime(''),null);
});
