do $test$
declare p uuid;s uuid;result jsonb;token1 uuid:='00000000-0000-4000-8000-000000000011';token2 uuid:='00000000-0000-4000-8000-000000000012';u uuid:='00000000-0000-4000-8000-000000000001';
begin
 select id into p from public.plans where code='premium';
 result:=pg_temp.bt_claim_checkout(u,p,'hash-test',token1);
 s:=(result->'subscription'->>'id')::uuid;
 if s is null then raise exception 'TEST_FAILED_RESERVATION';end if;
 result:=pg_temp.bt_claim_checkout(u,p,'hash-test',token2);
 if result->>'error'<>'BILLING_BUSY' then raise exception 'TEST_FAILED_DOUBLE_CHECKOUT';end if;
 if (select count(*) from pg_temp.bt_subscriptions)<>1 then raise exception 'TEST_FAILED_DUPLICATE_SUB';end if;
 update pg_temp.bt_subscriptions set billing_lock_token=null,billing_lock_until=null,asaas_subscription_id='sub_test',asaas_customer_id='cus_test',checkout_state='completed' where id=s;
 result:=pg_temp.bt_claim_billing_event('evt_test','PAYMENT_RECEIVED','sub_test',token1);
 if result->'subscription'->>'id' is null then raise exception 'TEST_FAILED_EVENT_CLAIM';end if;
 result:=pg_temp.bt_claim_billing_event('evt_other','PAYMENT_OVERDUE','sub_test',token2);
 if result->>'error'<>'BILLING_BUSY' then raise exception 'TEST_FAILED_CONCURRENT_WEBHOOK';end if;
 begin
  perform pg_temp.bt_finish_billing_event('evt_test',s,token1,'active',null,false);
  raise exception 'TEST_FAILED_EMPTY_ACCESS';
 exception when raise_exception then if sqlerrm<>'INVALID_ACCESS_PERIOD' then raise;end if;
 end;
 if (select state from pg_temp.bt_inbox where provider_event_id='evt_test')<>'pending' then raise exception 'TEST_FAILED_ROLLBACK';end if;
 if (select status from pg_temp.bt_subscriptions where id=s)<>'incomplete' then raise exception 'TEST_FAILED_PARTIAL_WRITE';end if;
 perform pg_temp.bt_finish_billing_event('evt_test',s,token1,'active',now()+interval '1 month',false);
 if (select state from pg_temp.bt_inbox where provider_event_id='evt_test')<>'done' then raise exception 'TEST_FAILED_EVENT_COMMIT';end if;
 result:=pg_temp.bt_claim_billing_event('evt_test','PAYMENT_RECEIVED','sub_test',token2);
 if result->>'duplicate'<>'true' then raise exception 'TEST_FAILED_DEDUPLICATION';end if;
 result:=pg_temp.bt_claim_billing_cancellation('00000000-0000-4000-8000-000000000002',s,token2);
 if result->>'error'<>'SUBSCRIPTION_NOT_FOUND' then raise exception 'TEST_FAILED_OWNERSHIP';end if;
 perform pg_temp.bt_claim_billing_cancellation(u,s,token2);
 result:=pg_temp.bt_finish_billing_cancellation(s,token2);
 if result->>'status'<>'active' then raise exception 'TEST_FAILED_PAID_PERIOD_PRESERVATION';end if;
 if has_function_privilege('authenticated','pg_temp.bt_claim_checkout(uuid,uuid,text,uuid)','EXECUTE') then raise exception 'TEST_FAILED_RPC_PUBLIC';end if;
 if has_table_privilege('authenticated','pg_temp.bt_inbox','SELECT') then raise exception 'TEST_FAILED_INBOX_PUBLIC';end if;
end $test$;
select 'transactional_reservation_lease_deduplication_atomicity_ownership_and_cancellation_passed' as test_result;
rollback;
