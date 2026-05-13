-- 병합된 우측(source) 매장 27개 하드 삭제
-- 선행 마이그레이션 20260513120000_merge_duplicate_stores 에서 WorkRecord/
-- StoreTemplateMember/CollectionRequest 의 storeId 를 모두 좌측으로 이전했다.
-- StoreItem(우측 매장 메뉴 55건)은 Store.id 의 ON DELETE CASCADE 로 자동 삭제된다.

DELETE FROM "Store"
WHERE "id" IN (
  'cmnnwkidj000b04jo82vivw0p', -- 홍익돈까스 회기
  'cmninbdev000p04l8p16vjvm5', -- 해봉 목동
  'cmmlb4mfe000604i8wtc5xxnf', -- 하디르
  'cmnsqn6xc000f04l7zwslht1y', -- 프랑제리 광흥창
  'cmnsqkcyn000c04l7chiqwdwu', -- 프랑스 루브르 염리
  'cmnfe98ie000604l557ktarp3', -- 파크랜드 수락산
  'cmmilra5p000004l5xgehkg4b', -- 투썸 야탑
  'cmninakdu000l04l8wcrfojyf', -- 원두막
  'cmmouavuy000004jt8xaj5jgm', -- 영등포제일큰약국
  'cmnmgsqyr000004jr28pg8l2n', -- 약손명가 성신여대
  'cmnyjvs13000004l7h0le6f0s', -- 신사골감자탕 야탑
  'cmmj0ik55001w04l8g9cb8asj', -- 신사골감자탕 을지대
  'cmmj0czyl001m04l8ojyoxpjr', -- 신사골감자탕 수진
  'cmnyjv4ag000a04k1x946swt1', -- 신사골감자탕 모란
  'cmm7je3fk000g04l79wi3474w', -- 투썸 수서
  'cmmrhlnb8000904l5ep85jwtm', -- 육전국밥 종로4가
  'cmninl7e5000x04js8ip58bjc', -- 보드람치킨 오목교
  'cmm8zvm5b001004lagzarynmn', -- 모코커피
  'cmnfnph9t000l04jp3vv5ilb6', -- 누리
  'cmmhs010y006qc0w79ui13e8b', -- k2 성수
  'cmminwhdo000404jslmshe8jo', -- 레드포스 평촌
  'cmnh7hczn001404jok30on82z', -- 남도술상 본점
  'cmnfeabts000b04l582votb34', -- 강강술래 상계
  'cmmouikvu000e04jtnc2cch5k', -- 강강술래 당산
  'cmmseekhh000004lebgwnhx5k', -- 대송참숯 여의도
  'cmnx0ueie000j04jo6z1sb62g', -- 대박집 낙성대
  'cmmj2m3hj000x04l1cfsz3qrh'  -- 갈비도락 상현
);
