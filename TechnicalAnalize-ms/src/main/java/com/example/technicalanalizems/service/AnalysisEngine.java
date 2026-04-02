package com.example.technicalanalizems.service;
import org.jfree.chart.*;
import org.jfree.chart.annotations.XYBoxAnnotation;
import org.jfree.chart.annotations.XYLineAnnotation;
import org.jfree.chart.annotations.XYTextAnnotation;
import org.jfree.chart.axis.DateAxis;
import org.jfree.chart.axis.NumberAxis;
import org.jfree.chart.plot.CombinedDomainXYPlot;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.chart.plot.ValueMarker;
import org.jfree.chart.plot.XYPlot;
import org.jfree.chart.renderer.xy.CandlestickRenderer;
import org.jfree.chart.renderer.xy.XYLineAndShapeRenderer;
import org.jfree.chart.ui.TextAnchor;
import org.jfree.data.xy.DefaultHighLowDataset;
import org.jfree.data.xy.XYDataset;
import org.jfree.data.xy.XYSeries;
import org.jfree.data.xy.XYSeriesCollection;
import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Component
public class AnalysisEngine {

    public byte[] generateChart(String symbol, List<List<Object>> rawData) throws Exception {
        int limit = Math.min(rawData.size(), 90);
        List<List<Object>> chartData = rawData.subList(rawData.size() - limit, rawData.size());
        DefaultHighLowDataset dataset = createDataset(symbol, chartData);

        DateAxis domainAxis = new DateAxis("Time");
        domainAxis.setAxisLineVisible(false);
        CombinedDomainXYPlot combinedPlot = new CombinedDomainXYPlot(domainAxis);
        combinedPlot.setGap(12.0);
        combinedPlot.setOrientation(PlotOrientation.VERTICAL);
        combinedPlot.setBackgroundPaint(Color.WHITE);

        XYPlot pricePlot = new XYPlot();
        pricePlot.setDataset(dataset);
        pricePlot.setBackgroundPaint(Color.WHITE);
        pricePlot.setOutlineVisible(false);
        pricePlot.setRangeGridlinesVisible(false);
        pricePlot.setDomainGridlinesVisible(false);

        NumberAxis rangeAxisPrice = new NumberAxis();
        rangeAxisPrice.setAutoRangeIncludesZero(false);
        rangeAxisPrice.setTickLabelFont(new Font("SansSerif", Font.PLAIN, 11));
        rangeAxisPrice.setAxisLineVisible(false);
        pricePlot.setRangeAxis(rangeAxisPrice);

        CandlestickRenderer renderer = new CandlestickRenderer();
        renderer.setUpPaint(new Color(38, 166, 154));
        renderer.setDownPaint(new Color(239, 83, 80));
        renderer.setUseOutlinePaint(true);
        renderer.setSeriesOutlinePaint(0, Color.BLACK);
        renderer.setAutoWidthMethod(CandlestickRenderer.WIDTHMETHOD_AVERAGE);
        renderer.setDrawVolume(false);
        pricePlot.setRenderer(renderer);

        addCleanSMC(pricePlot, dataset);
        addICTConcepts(pricePlot, dataset);

        XYPlot rsiPlot = new XYPlot();
        XYDataset rsiDataset = createRsiDataset(chartData);
        rsiPlot.setDataset(rsiDataset);
        rsiPlot.setBackgroundPaint(Color.WHITE);
        rsiPlot.setOutlineVisible(false);
        rsiPlot.setRangeGridlinesVisible(true);

        XYLineAndShapeRenderer rsiRenderer = new XYLineAndShapeRenderer(true, false);
        rsiRenderer.setSeriesPaint(0, new Color(100, 149, 237));
        rsiPlot.setRenderer(rsiRenderer);

        NumberAxis rangeAxisRSI = new NumberAxis("RSI");
        rangeAxisRSI.setRange(0.0, 100.0);
        rangeAxisRSI.setTickLabelFont(new Font("SansSerif", Font.PLAIN, 9));
        rangeAxisRSI.setAxisLineVisible(false);
        rsiPlot.setRangeAxis(rangeAxisRSI);

        ValueMarker marker50 = new ValueMarker(50.0);
        marker50.setPaint(Color.LIGHT_GRAY);
        marker50.setStroke(new BasicStroke(0.8f, 1, 1, 1.0f, new float[]{4.0f}, 0.0f));
        rsiPlot.addRangeMarker(marker50);

        combinedPlot.add(pricePlot, 3);
        combinedPlot.add(rsiPlot, 1);

        JFreeChart chart = new JFreeChart(symbol + " Analysis", new Font("SansSerif", Font.BOLD, 18), combinedPlot, false);
        chart.setBackgroundPaint(Color.WHITE);

        BufferedImage img = chart.createBufferedImage(1400, 850);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }

    private void addCleanSMC(XYPlot plot, DefaultHighLowDataset ds) {
        int count = ds.getItemCount(0);
        if (count < 3) return;

        double maxH = 0, minL = Double.MAX_VALUE;
        for (int i = 0; i < count; i++) {
            if (ds.getHighValue(0, i) > maxH) maxH = ds.getHighValue(0, i);
            if (ds.getLowValue(0, i) < minL) minL = ds.getLowValue(0, i);
        }

        // BSL & SSL Xətləri
        Stroke dash = new BasicStroke(1.5f, 1, 1, 1.0f, new float[]{6.0f}, 0.0f);
        plot.addAnnotation(new XYLineAnnotation(ds.getXValue(0, 0), maxH, ds.getXValue(0, count-1), maxH, dash, Color.DARK_GRAY));
        addSmallLabel(plot, ds.getXValue(0, count-15), maxH, "BSL", Color.DARK_GRAY);

        plot.addAnnotation(new XYLineAnnotation(ds.getXValue(0, 0), minL, ds.getXValue(0, count-1), minL, dash, Color.DARK_GRAY));
        addSmallLabel(plot, ds.getXValue(0, count-15), minL, "SSL", Color.DARK_GRAY);

        // --- DINAMIK FVG (Fair Value Gap) MƏNTİQİ ---
        // Minimum FVG ölçüsü (Çox xırda boşluqları cızıqlamamaq üçün 0.1% limit qoyuruq)
        double minGapThreshold = minL * 0.001;

        for (int i = count - 2; i > count - 45 && i > 1; i--) {
            // FVG 3 şamdan ibarətdir: (i-1), (i), (i+1)
            double h1 = ds.getHighValue(0, i - 1); // 1-ci şamın ən yüksək nöqtəsi
            double l3 = ds.getLowValue(0, i + 1);  // 3-cü şamın ən aşağı nöqtəsi

            double l1 = ds.getLowValue(0, i - 1);  // 1-ci şamın ən aşağı nöqtəsi
            double h3 = ds.getHighValue(0, i + 1); // 3-cü şamın ən yüksək nöqtəsi

            // 1. Bullish FVG (Bazar yuxarı uçub, aşağıda boşluq qalıb)
            if (l3 > h1 && (l3 - h1) > minGapThreshold) {
                // Qutu h1-dən l3-ə qədər çəkilir (Aşağıdan yuxarı)
                plot.addAnnotation(new XYBoxAnnotation(ds.getXValue(0, i), h1, ds.getXValue(0, count-1), l3,
                        new BasicStroke(0), null, new Color(38, 166, 154, 50)));
                addSmallLabel(plot, ds.getXValue(0, i), h1, "FVG (Bullish)", new Color(38, 166, 154).darker());
            }

            // 2. Bearish FVG (Bazar aşağı çöküb, yuxarıda boşluq qalıb)
            if (l1 > h3 && (l1 - h3) > minGapThreshold) {
                // Qutu h3-dən l1-ə qədər çəkilir (Aşağıdan yuxarı)
                plot.addAnnotation(new XYBoxAnnotation(ds.getXValue(0, i), h3, ds.getXValue(0, count-1), l1,
                        new BasicStroke(0), null, new Color(239, 83, 80, 50)));
                addSmallLabel(plot, ds.getXValue(0, i), h3, "FVG (Bearish)", new Color(239, 83, 80).darker());
            }
        }
    }

    private void addICTConcepts(XYPlot plot, DefaultHighLowDataset ds) {
        int count = ds.getItemCount(0);
        if (count < 10) return;

        double maxH = 0, minL = Double.MAX_VALUE;
        for (int i = 0; i < count; i++) {
            if (ds.getHighValue(0, i) > maxH) maxH = ds.getHighValue(0, i);
            if (ds.getLowValue(0, i) < minL) minL = ds.getLowValue(0, i);
        }

        // Equilibrium (Orta xətt)
        double eq = (maxH + minL) / 2;

        // Premium Zone (0.5 - 1.0)
        plot.addAnnotation(new XYBoxAnnotation(ds.getXValue(0, 0), eq, ds.getXValue(0, count-1), maxH,
                new BasicStroke(0), null, new Color(255, 0, 0, 8))); // Çox açıq qırmızı
        addSmallLabel(plot, ds.getXValue(0, 2), maxH * 0.99, "PREMIUM", new Color(200, 0, 0, 150));

        // Discount Zone (0.0 - 0.5)
        plot.addAnnotation(new XYBoxAnnotation(ds.getXValue(0, 0), minL, ds.getXValue(0, count-1), eq,
                new BasicStroke(0), null, new Color(0, 255, 0, 8))); // Çox açıq yaşıl
        addSmallLabel(plot, ds.getXValue(0, 2), minL * 1.01, "DISCOUNT", new Color(0, 150, 0, 150));

        // Equilibrium xətti
        plot.addAnnotation(new XYLineAnnotation(ds.getXValue(0, 0), eq, ds.getXValue(0, count-1), eq,
                new BasicStroke(1.0f, 1, 1, 1.0f, new float[]{8.0f}, 0.0f), Color.ORANGE));

        // Swing High & Swing Low axtarışı (Son 5 şam xaric)
        for (int i = 3; i < count - 3; i++) {
            boolean isSH = ds.getHighValue(0, i) > ds.getHighValue(0, i-1) &&
                    ds.getHighValue(0, i) > ds.getHighValue(0, i-2) &&
                    ds.getHighValue(0, i) > ds.getHighValue(0, i+1) &&
                    ds.getHighValue(0, i) > ds.getHighValue(0, i+2);

            boolean isSL = ds.getLowValue(0, i) < ds.getLowValue(0, i-1) &&
                    ds.getLowValue(0, i) < ds.getLowValue(0, i-2) &&
                    ds.getLowValue(0, i) < ds.getLowValue(0, i+1) &&
                    ds.getLowValue(0, i) < ds.getLowValue(0, i+2);

            if (isSH) addSmallLabel(plot, ds.getXValue(0, i), ds.getHighValue(0, i) * 1.002, "SH", Color.RED);
            if (isSL) addSmallLabel(plot, ds.getXValue(0, i), ds.getLowValue(0, i) * 0.998, "SL", new Color(0, 120, 0));
        }

        // Sadə MSS (Market Structure Shift) tapıntısı
        double lastClose = ds.getCloseValue(0, count - 1);
        double recentPeak = ds.getHighValue(0, count - 10);
        if (lastClose > recentPeak) {
            plot.addAnnotation(new XYLineAnnotation(ds.getXValue(0, count-10), recentPeak, ds.getXValue(0, count-1), recentPeak,
                    new BasicStroke(1.5f, 1, 1, 1.0f, new float[]{3.0f}, 0.0f), Color.BLUE));
            addSmallLabel(plot, ds.getXValue(0, count-5), recentPeak, "MSS", Color.BLUE);
        }
    }

    private XYDataset createRsiDataset(List<List<Object>> rawData) {
        XYSeries series = new XYSeries("RSI");
        int period = 14;
        if (rawData.size() > period) {
            List<Double> closes = new ArrayList<>();
            for (List<Object> row : rawData) closes.add(Double.parseDouble(row.get(4).toString()));
            double[] rsiValues = calculateRSI(closes, period);
            for (int i = period; i < rawData.size(); i++)
                series.add((long)rawData.get(i).get(0), rsiValues[i]);
        }
        return new XYSeriesCollection(series);
    }

    private double[] calculateRSI(List<Double> closes, int period) {
        double[] rsi = new double[closes.size()];
        double avgGain = 0, avgLoss = 0;
        for (int i = 1; i <= period; i++) {
            double diff = closes.get(i) - closes.get(i-1);
            if (diff >= 0) avgGain += diff; else avgLoss -= diff;
        }
        avgGain /= period; avgLoss /= period;
        for (int i = period; i < closes.size(); i++) {
            double diff = closes.get(i) - closes.get(i-1);
            double g = diff >= 0 ? diff : 0;
            double l = diff < 0 ? -diff : 0;
            avgGain = (avgGain * (period-1) + g) / period;
            avgLoss = (avgLoss * (period-1) + l) / period;
            rsi[i] = avgLoss == 0 ? 100 : 100 - (100 / (1 + (avgGain/avgLoss)));
        }
        return rsi;
    }

    private void addSmallLabel(XYPlot plot, double x, double y, String text, Color color) {
        XYTextAnnotation ann = new XYTextAnnotation(text, x, y);
        ann.setFont(new Font("Arial", Font.BOLD, 9));
        ann.setPaint(color);
        ann.setTextAnchor(TextAnchor.BOTTOM_LEFT);
        plot.addAnnotation(ann);
    }

    private DefaultHighLowDataset createDataset(String symbol, List<List<Object>> rawData) {
        int size = rawData.size();
        Date[] date = new Date[size];
        double[] h = new double[size], l = new double[size], o = new double[size], c = new double[size], v = new double[size];
        for (int i = 0; i < size; i++) {
            List<Object> r = rawData.get(i);
            date[i] = new Date((Long) r.get(0));
            o[i] = Double.parseDouble(r.get(1).toString());
            h[i] = Double.parseDouble(r.get(2).toString());
            l[i] = Double.parseDouble(r.get(3).toString());
            c[i] = Double.parseDouble(r.get(4).toString());
            v[i] = Double.parseDouble(r.get(5).toString());
        }
        return new DefaultHighLowDataset(symbol, date, h, l, o, c, v);
    }




}




