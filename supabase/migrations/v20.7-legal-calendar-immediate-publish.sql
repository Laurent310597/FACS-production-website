-- FACS Website v20.7 - publish the reviewed July 2026 legal calendar immediately.
-- Run once in Supabase SQL Editor after v20.6-legal-calendar.sql.
-- The script is idempotent: it updates the original seed records and avoids
-- inserting duplicate split records when run more than once.

begin;

-- Nghị định 219/2025/NĐ-CP replaced the foreign-worker provisions of
-- Nghị định 152/2020/NĐ-CP from 07/08/2025 and no longer contains this
-- periodic employer report. Preserve the seed as an archived audit record.
update public.legal_calendar_events
set
  verification_status = 'rejected',
  status = 'archived',
  published_at = null,
  reviewed_at = now(),
  notes = 'Không công bố: khoản 2 Điều 35 Nghị định 219/2025/NĐ-CP làm hết hiệu lực nội dung về lao động nước ngoài tại Nghị định 152/2020/NĐ-CP từ 07/08/2025; Nghị định 219/2025/NĐ-CP không duy trì nghĩa vụ báo cáo định kỳ này.',
  legal_basis_vi = 'Khoản 2 Điều 35 Nghị định 219/2025/NĐ-CP',
  legal_basis_en = 'Clause 2 Article 35 of Decree 219/2025/ND-CP',
  official_source_url = 'https://vanban.chinhphu.vn/?docid=214840&pageid=27160',
  source_name = 'Cổng Thông tin điện tử Chính phủ',
  source_url = 'https://vanban.chinhphu.vn/?docid=214840&pageid=27160',
  source_tier = 'P1'
where title_vi = 'Báo cáo sử dụng lao động nước ngoài 6 tháng đầu năm 2026';

-- Split the two HSE obligations because they use different forms and recipients.
update public.legal_calendar_events
set
  title_vi = 'Báo cáo tình hình tai nạn lao động 6 tháng đầu năm 2026',
  title_en = 'First-half 2026 occupational accident report',
  summary_vi = 'Người sử dụng lao động lập báo cáo theo Phụ lục XII và gửi cơ quan chuyên môn về lao động nơi đặt trụ sở chính trước ngày 05/07/2026; ngày hiển thị 04/07 là ngày cuối cùng trước hạn.',
  summary_en = 'Employers prepare the report in Appendix XII and submit it to the competent labour authority before 5 July 2026; 4 July is displayed as the final day before the deadline.',
  target_audience_vi = 'Người sử dụng lao động thuộc khu vực có quan hệ lao động, kể cả kỳ không phát sinh tai nạn lao động',
  target_audience_en = 'Employers in the formal employment sector, including periods with no occupational accidents',
  legal_basis_vi = 'Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP; Phụ lục XII ban hành kèm theo Nghị định 39/2016/NĐ-CP',
  legal_basis_en = 'Clause 1 Article 24 and Appendix XII of Decree 39/2016/ND-CP',
  official_source_url = 'https://vanban.chinhphu.vn/default.aspx?docid=185028&pageid=27160',
  source_name = 'Cổng Thông tin điện tử Chính phủ',
  source_url = 'https://vanban.chinhphu.vn/default.aspx?docid=185028&pageid=27160',
  source_tier = 'P1',
  verification_status = 'verified',
  status = 'published',
  published_at = coalesce(published_at, now()),
  reviewed_at = now(),
  notes = 'Đã đối chiếu nguồn P1. Cần kiểm tra hướng dẫn tiếp nhận cụ thể của địa phương tại thời điểm nộp.'
where title_vi in (
  'Báo cáo tai nạn lao động và y tế lao động 6 tháng đầu năm 2026',
  'Báo cáo tình hình tai nạn lao động 6 tháng đầu năm 2026'
);

insert into public.legal_calendar_events (
  event_date, category, title_vi, title_en, summary_vi, summary_en,
  target_audience_vi, target_audience_en, period_label_vi, period_label_en,
  legal_basis_vi, legal_basis_en, official_source_url,
  source_name, source_url, source_tier,
  verification_status, status, published_at, reviewed_at, notes
)
select
  '2026-07-04'::date,
  'hse',
  'Báo cáo y tế lao động 6 tháng đầu năm 2026',
  'First-half 2026 occupational health report',
  'Cơ sở lao động lập báo cáo theo Phụ lục 8 và gửi đơn vị y tế theo phân cấp trước ngày 05/07/2026; ngày hiển thị 04/07 là ngày cuối cùng trước hạn.',
  'Workplaces prepare the report in Appendix 8 and submit it to the designated health authority before 5 July 2026; 4 July is displayed as the final day before the deadline.',
  'Cơ sở lao động thuộc đối tượng báo cáo y tế lao động',
  'Workplaces subject to occupational health reporting',
  '6 tháng đầu năm 2026',
  'First half of 2026',
  'Khoản 1 và khoản 3 Điều 10 Thông tư 19/2016/TT-BYT; Phụ lục 8 ban hành kèm theo Thông tư 19/2016/TT-BYT',
  'Clauses 1 and 3 Article 10 and Appendix 8 of Circular 19/2016/TT-BYT',
  'https://vanban.chinhphu.vn/default.aspx?docid=186904&pageid=27160',
  'Cổng Thông tin điện tử Chính phủ',
  'https://vanban.chinhphu.vn/default.aspx?docid=186904&pageid=27160',
  'P1',
  'verified',
  'published',
  now(),
  now(),
  'Đã đối chiếu nguồn P1. Cần kiểm tra hướng dẫn tiếp nhận cụ thể của cơ quan y tế địa phương.'
where not exists (
  select 1 from public.legal_calendar_events
  where event_date = '2026-07-04'::date
    and title_vi = 'Báo cáo y tế lao động 6 tháng đầu năm 2026'
);

-- Apply the filing deadlines effective from 01/07/2026 under Decree 252/2026.
update public.legal_calendar_events
set
  legal_basis_vi = 'Khoản 2 Điều 10 Nghị định 252/2026/NĐ-CP',
  legal_basis_en = 'Clause 2 Article 10 of Decree 252/2026/ND-CP',
  official_source_url = 'https://vanban.chinhphu.vn/?docid=218690&pageid=27160',
  source_name = 'Cổng Thông tin điện tử Chính phủ',
  source_url = 'https://vanban.chinhphu.vn/?docid=218690&pageid=27160',
  source_tier = 'P1',
  verification_status = 'verified',
  status = 'published',
  published_at = coalesce(published_at, now()),
  reviewed_at = now(),
  notes = 'Thời hạn chung cho hồ sơ khai thuế theo tháng. Doanh nghiệp phải xác định sắc thuế và kỳ khai thực tế áp dụng.'
where title_vi = 'Hồ sơ khai thuế theo tháng của kỳ tháng 6/2026';

update public.legal_calendar_events
set
  event_date = '2026-07-31'::date,
  legal_basis_vi = 'Điều 24 Nghị định 252/2026/NĐ-CP',
  legal_basis_en = 'Article 24 of Decree 252/2026/ND-CP',
  official_source_url = 'https://vanban.chinhphu.vn/?docid=218690&pageid=27160',
  source_name = 'Cổng Thông tin điện tử Chính phủ',
  source_url = 'https://vanban.chinhphu.vn/?docid=218690&pageid=27160',
  source_tier = 'P1',
  verification_status = 'verified',
  status = 'published',
  published_at = coalesce(published_at, now()),
  reviewed_at = now(),
  notes = 'Nghị định 252/2026/NĐ-CP quy định thời hạn tạm nộp quý chậm nhất là ngày cuối cùng của tháng đầu của quý tiếp theo.'
where title_vi = 'Nộp thuế TNDN tạm tính Quý 2/2026';

update public.legal_calendar_events
set
  legal_basis_vi = 'Khoản 3 Điều 10 Nghị định 252/2026/NĐ-CP',
  legal_basis_en = 'Clause 3 Article 10 of Decree 252/2026/ND-CP',
  official_source_url = 'https://vanban.chinhphu.vn/?docid=218690&pageid=27160',
  source_name = 'Cổng Thông tin điện tử Chính phủ',
  source_url = 'https://vanban.chinhphu.vn/?docid=218690&pageid=27160',
  source_tier = 'P1',
  verification_status = 'verified',
  status = 'published',
  published_at = coalesce(published_at, now()),
  reviewed_at = now(),
  notes = 'Thời hạn chung cho hồ sơ khai thuế theo quý. Doanh nghiệp phải xác định sắc thuế và kỳ khai thực tế áp dụng.'
where title_vi = 'Hồ sơ khai thuế theo quý của Quý 2/2026';

-- Split compulsory insurance and trade-union funding because the legal bases differ.
update public.legal_calendar_events
set
  title_vi = 'Đóng BHXH bắt buộc, BHYT và BHTN kỳ tháng 6/2026',
  title_en = 'Compulsory social, health and unemployment insurance payment for June 2026',
  summary_vi = 'Đơn vị đóng theo phương thức hằng tháng thực hiện chậm nhất vào ngày cuối cùng của tháng tiếp theo; cần đối chiếu phương thức đóng đã đăng ký và tình trạng lao động thực tế.',
  summary_en = 'Monthly contributors pay no later than the final day of the following month, subject to the registered contribution method and actual workforce.',
  legal_basis_vi = 'Khoản 4 Điều 34 Luật Bảo hiểm xã hội số 41/2024/QH15 và pháp luật liên quan về BHYT, BHTN',
  legal_basis_en = 'Clause 4 Article 34 of Law on Social Insurance No. 41/2024/QH15 and related health and unemployment insurance legislation',
  official_source_url = 'https://vanban.chinhphu.vn/?docid=211199&pageid=27160',
  source_name = 'Cổng Thông tin điện tử Chính phủ',
  source_url = 'https://vanban.chinhphu.vn/?docid=211199&pageid=27160',
  source_tier = 'P1',
  verification_status = 'verified',
  status = 'published',
  published_at = coalesce(published_at, now()),
  reviewed_at = now(),
  notes = 'Thời hạn hiển thị áp dụng cho phương thức đóng hằng tháng; trường hợp được áp dụng chu kỳ khác cần kiểm tra riêng.'
where title_vi in (
  'Trích nộp BHXH, BHYT, BHTN và kinh phí công đoàn',
  'Đóng BHXH bắt buộc, BHYT và BHTN kỳ tháng 6/2026'
);

insert into public.legal_calendar_events (
  event_date, category, title_vi, title_en, summary_vi, summary_en,
  target_audience_vi, target_audience_en, period_label_vi, period_label_en,
  legal_basis_vi, legal_basis_en, official_source_url,
  source_name, source_url, source_tier,
  verification_status, status, published_at, reviewed_at, notes
)
select
  '2026-07-31'::date,
  'labor',
  'Đóng kinh phí công đoàn kỳ tháng 6/2026',
  'Trade union funding payment for June 2026',
  'Đối tượng đóng theo tháng thực hiện chậm nhất vào ngày cuối cùng của tháng tiếp theo. Một số doanh nghiệp đặc thù có thể đăng ký phương thức đóng 03 tháng một lần.',
  'Monthly contributors pay no later than the final day of the following month. Certain eligible enterprises may register for a three-month contribution cycle.',
  'Doanh nghiệp, hợp tác xã, liên hiệp hợp tác xã và cơ quan, tổ chức, đơn vị khác có sử dụng lao động thuộc đối tượng đóng',
  'Enterprises, cooperatives and other employing organisations subject to trade union funding',
  'Tháng 6/2026',
  'June 2026',
  'Điểm a khoản 1 và điểm a khoản 2 Điều 4 Nghị định 105/2026/NĐ-CP',
  'Point a Clause 1 and Point a Clause 2 Article 4 of Decree 105/2026/ND-CP',
  'https://vanban.chinhphu.vn/?docid=217500&pageid=27160',
  'Cổng Thông tin điện tử Chính phủ',
  'https://vanban.chinhphu.vn/?docid=217500&pageid=27160',
  'P1',
  'verified',
  'published',
  now(),
  now(),
  'Đã đối chiếu Nghị định 105/2026/NĐ-CP, có hiệu lực từ 16/05/2026.'
where not exists (
  select 1 from public.legal_calendar_events
  where event_date = '2026-07-31'::date
    and title_vi = 'Đóng kinh phí công đoàn kỳ tháng 6/2026'
);

commit;

select status, verification_status, count(*) as event_count
from public.legal_calendar_events
where event_date between '2026-07-01'::date and '2026-07-31'::date
group by status, verification_status
order by status, verification_status;
