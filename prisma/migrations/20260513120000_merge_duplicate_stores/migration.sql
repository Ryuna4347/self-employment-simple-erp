-- 중복 등록된 매장 27쌍 병합: 우측(source) → 좌측(target)
-- 이전 대상: WorkRecord, StoreTemplateMember, CollectionRequest
-- 스냅샷(storeNameSnapshot 등)은 좌측 매장 정보로 덮어쓴다.
-- 우측(source) 매장 자체와 StoreItem은 변경하지 않는다(요청 사항).
--
-- 사전 검증 결과(2026-05-13 기준):
--   - 54개 매장 모두 존재, soft-delete 없음
--   - StoreTemplateMember 중복(동일 코스에 양쪽 ID 동시 등록): 0건 (사전 수동 정리 완료)
--   - 영향 row: WorkRecord 74, StoreTemplateMember 25, CollectionRequest 1

-- 1) WorkRecord: storeId + snapshot 4개 필드 일괄 갱신
WITH pairs(target_id, source_id) AS (
  VALUES
    ('cmnd16cvc000304in7wfsfg1i', 'cmnnwkidj000b04jo82vivw0p'), -- 홍익돈까스 회기
    ('cmnso389t000604kym1rb1rrf', 'cmninbdev000p04l8p16vjvm5'), -- 해봉 목동
    ('cmnh7aei0000k04ju7s52ybxo', 'cmmlb4mfe000604i8wtc5xxnf'), -- 하디르
    ('cmnimrz5x000304l8dilmz1dp', 'cmnsqn6xc000f04l7zwslht1y'), -- 프랑제리 광흥창
    ('cmnimpgjx000004l8sbmrhd52', 'cmnsqkcyn000c04l7chiqwdwu'), -- 프랑스 루브르 염리
    ('cmnpf8t2n000304k1tnso13l4', 'cmnfe98ie000604l557ktarp3'), -- 파크랜드 수락산
    ('cmnyjx461000d04k1h7tvfoxg', 'cmmilra5p000004l5xgehkg4b'), -- 투썸 야탑
    ('cmnsqvj34000v04l7hr4q0v3a', 'cmninakdu000l04l8wcrfojyf'), -- 원두막
    ('cmnsqq1ne000j04l706h182tv', 'cmmouavuy000004jt8xaj5jgm'), -- 영등포제일큰약국
    ('cmncg9lag000004jr4igjf3s0', 'cmnmgsqyr000004jr28pg8l2n'), -- 약손명가 성신여대
    ('cmmilof6b000004k1x1a1xohh', 'cmnyjvs13000004l7h0le6f0s'), -- 신사골감자탕 야탑
    ('cmnyjpki8000304jmfbsxwkaa', 'cmmj0ik55001w04l8g9cb8asj'), -- 신사골감자탕 을지대
    ('cmnyju2qk000304jvcu5fnlq4', 'cmmj0czyl001m04l8ojyoxpjr'), -- 신사골감자탕 수진
    ('cmmj0dvjy000g04jmu9yibk7b', 'cmnyjv4ag000a04k1x946swt1'), -- 신사골감자탕 모란
    ('cmmhs000u0029c0w75bbgf318', 'cmm7je3fk000g04l79wi3474w'), -- 투썸 수서
    ('cmmric6u9002404l5ocooojrg', 'cmmrhlnb8000904l5ep85jwtm'), -- 육전국밥 종로4가
    ('cmnsqyomt001804k14rd02f35', 'cmninl7e5000x04js8ip58bjc'), -- 보드람치킨 오목교
    ('cmmt335f1001j04jsdhyu7ay7', 'cmm8zvm5b001004lagzarynmn'), -- 모코커피
    ('cmnazhupa000604jm7g4bnjlv', 'cmnfnph9t000l04jp3vv5ilb6'), -- 누리
    ('cmmriu1pg002u04l56ojuwnln', 'cmmhs010y006qc0w79ui13e8b'), -- k2 성수
    ('cmnx12axu001304jlrvvy101f', 'cmminwhdo000404jslmshe8jo'), -- 레드포스 평촌
    ('cmmlg42gq001h04juvkvmw4as', 'cmnh7hczn001404jok30on82z'), -- 남도술상 본점
    ('cmnpf9ron000604l7zh1vlwpo', 'cmnfeabts000b04l582votb34'), -- 강강술래 상계
    ('cmnvo9d6m000504l2k2j0iduv', 'cmmouikvu000e04jtnc2cch5k'), -- 강강술래 당산
    ('cmmign5jb000004l5hadbz4bu', 'cmmseekhh000004lebgwnhx5k'), -- 대송참숯 여의도
    ('cmmih3nno000004kyregcp4hv', 'cmnx0ueie000j04jo6z1sb62g'), -- 대박집 낙성대
    ('cmnfud7k6000904lec52yltpo', 'cmmj2m3hj000x04l1cfsz3qrh')  -- 갈비도락 상현
),
target_info AS (
  SELECT
    p.source_id,
    p.target_id,
    s."name"         AS target_name,
    s."address"      AS target_address,
    s."managerName"  AS target_manager_name,
    s."PaymentType"  AS target_payment_type
  FROM pairs p
  JOIN "Store" s ON s."id" = p.target_id
)
UPDATE "WorkRecord" wr
SET
  "storeId"              = ti.target_id,
  "storeNameSnapshot"    = ti.target_name,
  "storeAddressSnapshot" = ti.target_address,
  "managerNameSnapshot"  = ti.target_manager_name,
  "paymentTypeSnapshot"  = ti.target_payment_type
FROM target_info ti
WHERE wr."storeId" = ti.source_id;

-- 2) StoreTemplateMember: storeId만 좌측으로 갱신
WITH pairs(target_id, source_id) AS (
  VALUES
    ('cmnd16cvc000304in7wfsfg1i', 'cmnnwkidj000b04jo82vivw0p'),
    ('cmnso389t000604kym1rb1rrf', 'cmninbdev000p04l8p16vjvm5'),
    ('cmnh7aei0000k04ju7s52ybxo', 'cmmlb4mfe000604i8wtc5xxnf'),
    ('cmnimrz5x000304l8dilmz1dp', 'cmnsqn6xc000f04l7zwslht1y'),
    ('cmnimpgjx000004l8sbmrhd52', 'cmnsqkcyn000c04l7chiqwdwu'),
    ('cmnpf8t2n000304k1tnso13l4', 'cmnfe98ie000604l557ktarp3'),
    ('cmnyjx461000d04k1h7tvfoxg', 'cmmilra5p000004l5xgehkg4b'),
    ('cmnsqvj34000v04l7hr4q0v3a', 'cmninakdu000l04l8wcrfojyf'),
    ('cmnsqq1ne000j04l706h182tv', 'cmmouavuy000004jt8xaj5jgm'),
    ('cmncg9lag000004jr4igjf3s0', 'cmnmgsqyr000004jr28pg8l2n'),
    ('cmmilof6b000004k1x1a1xohh', 'cmnyjvs13000004l7h0le6f0s'),
    ('cmnyjpki8000304jmfbsxwkaa', 'cmmj0ik55001w04l8g9cb8asj'),
    ('cmnyju2qk000304jvcu5fnlq4', 'cmmj0czyl001m04l8ojyoxpjr'),
    ('cmmj0dvjy000g04jmu9yibk7b', 'cmnyjv4ag000a04k1x946swt1'),
    ('cmmhs000u0029c0w75bbgf318', 'cmm7je3fk000g04l79wi3474w'),
    ('cmmric6u9002404l5ocooojrg', 'cmmrhlnb8000904l5ep85jwtm'),
    ('cmnsqyomt001804k14rd02f35', 'cmninl7e5000x04js8ip58bjc'),
    ('cmmt335f1001j04jsdhyu7ay7', 'cmm8zvm5b001004lagzarynmn'),
    ('cmnazhupa000604jm7g4bnjlv', 'cmnfnph9t000l04jp3vv5ilb6'),
    ('cmmriu1pg002u04l56ojuwnln', 'cmmhs010y006qc0w79ui13e8b'),
    ('cmnx12axu001304jlrvvy101f', 'cmminwhdo000404jslmshe8jo'),
    ('cmmlg42gq001h04juvkvmw4as', 'cmnh7hczn001404jok30on82z'),
    ('cmnpf9ron000604l7zh1vlwpo', 'cmnfeabts000b04l582votb34'),
    ('cmnvo9d6m000504l2k2j0iduv', 'cmmouikvu000e04jtnc2cch5k'),
    ('cmmign5jb000004l5hadbz4bu', 'cmmseekhh000004lebgwnhx5k'),
    ('cmmih3nno000004kyregcp4hv', 'cmnx0ueie000j04jo6z1sb62g'),
    ('cmnfud7k6000904lec52yltpo', 'cmmj2m3hj000x04l1cfsz3qrh')
)
UPDATE "StoreTemplateMember" m
SET "storeId" = p.target_id
FROM pairs p
WHERE m."storeId" = p.source_id;

-- 3) CollectionRequest: storeId + storeNameSnapshot 갱신
WITH pairs(target_id, source_id) AS (
  VALUES
    ('cmnd16cvc000304in7wfsfg1i', 'cmnnwkidj000b04jo82vivw0p'),
    ('cmnso389t000604kym1rb1rrf', 'cmninbdev000p04l8p16vjvm5'),
    ('cmnh7aei0000k04ju7s52ybxo', 'cmmlb4mfe000604i8wtc5xxnf'),
    ('cmnimrz5x000304l8dilmz1dp', 'cmnsqn6xc000f04l7zwslht1y'),
    ('cmnimpgjx000004l8sbmrhd52', 'cmnsqkcyn000c04l7chiqwdwu'),
    ('cmnpf8t2n000304k1tnso13l4', 'cmnfe98ie000604l557ktarp3'),
    ('cmnyjx461000d04k1h7tvfoxg', 'cmmilra5p000004l5xgehkg4b'),
    ('cmnsqvj34000v04l7hr4q0v3a', 'cmninakdu000l04l8wcrfojyf'),
    ('cmnsqq1ne000j04l706h182tv', 'cmmouavuy000004jt8xaj5jgm'),
    ('cmncg9lag000004jr4igjf3s0', 'cmnmgsqyr000004jr28pg8l2n'),
    ('cmmilof6b000004k1x1a1xohh', 'cmnyjvs13000004l7h0le6f0s'),
    ('cmnyjpki8000304jmfbsxwkaa', 'cmmj0ik55001w04l8g9cb8asj'),
    ('cmnyju2qk000304jvcu5fnlq4', 'cmmj0czyl001m04l8ojyoxpjr'),
    ('cmmj0dvjy000g04jmu9yibk7b', 'cmnyjv4ag000a04k1x946swt1'),
    ('cmmhs000u0029c0w75bbgf318', 'cmm7je3fk000g04l79wi3474w'),
    ('cmmric6u9002404l5ocooojrg', 'cmmrhlnb8000904l5ep85jwtm'),
    ('cmnsqyomt001804k14rd02f35', 'cmninl7e5000x04js8ip58bjc'),
    ('cmmt335f1001j04jsdhyu7ay7', 'cmm8zvm5b001004lagzarynmn'),
    ('cmnazhupa000604jm7g4bnjlv', 'cmnfnph9t000l04jp3vv5ilb6'),
    ('cmmriu1pg002u04l56ojuwnln', 'cmmhs010y006qc0w79ui13e8b'),
    ('cmnx12axu001304jlrvvy101f', 'cmminwhdo000404jslmshe8jo'),
    ('cmmlg42gq001h04juvkvmw4as', 'cmnh7hczn001404jok30on82z'),
    ('cmnpf9ron000604l7zh1vlwpo', 'cmnfeabts000b04l582votb34'),
    ('cmnvo9d6m000504l2k2j0iduv', 'cmmouikvu000e04jtnc2cch5k'),
    ('cmmign5jb000004l5hadbz4bu', 'cmmseekhh000004lebgwnhx5k'),
    ('cmmih3nno000004kyregcp4hv', 'cmnx0ueie000j04jo6z1sb62g'),
    ('cmnfud7k6000904lec52yltpo', 'cmmj2m3hj000x04l1cfsz3qrh')
),
target_info AS (
  SELECT
    p.source_id,
    p.target_id,
    s."name" AS target_name
  FROM pairs p
  JOIN "Store" s ON s."id" = p.target_id
)
UPDATE "CollectionRequest" cr
SET
  "storeId"           = ti.target_id,
  "storeNameSnapshot" = ti.target_name
FROM target_info ti
WHERE cr."storeId" = ti.source_id;
